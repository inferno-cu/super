package main

import (
	"fmt"
	"net"
	"sync"
)

import (
	"github.com/google/nftables"
	"github.com/google/nftables/expr"
)

type NFTablesManager struct {
	conn *nftables.Conn
	mu   sync.Mutex
}

func NewNFTablesManager() (*NFTablesManager, error) {
	conn, err := nftables.New()
	if err != nil {
		return nil, fmt.Errorf("failed to create nftables connection: %v", err)
	}

	return &NFTablesManager{
		conn: conn,
	}, nil
}

func (m *NFTablesManager) HasVerdictMac(ip, mac, iface, table, verdict string) (bool, error) {
	/*
	  err := exec.Command("nft", "get", "element", "inet", "filter", Table, "{", IP, ".", Iface, ".", MAC, ":", Verdict, "}").Run()
	  return err == nil
	*/
	m.mu.Lock()
	defer m.mu.Unlock()

	// Parse the IP address
	ipAddr := net.ParseIP(ip)
	if ipAddr == nil {
		return false, fmt.Errorf("invalid IP address: %s", ip)
	}

	// Get the set
	set, err := m.conn.GetSetByName(&nftables.Table{
		Family: nftables.TableFamilyINet,
		Name:   "filter",
	}, table)
	if err != nil {
		return false, fmt.Errorf("getting set %s: %w", table, err)
	}
	if set == nil {
		return false, fmt.Errorf("set %s not found", table)
	}

	// Get all elements from the set
	elements, err := m.conn.GetSetElements(set)
	if err != nil {
		return false, fmt.Errorf("getting elements from set %s: %w", table, err)
	}

	// Create the key we're looking for
	targetKey := make([]byte, 0)
	targetKey = append(targetKey, ipAddr.To4()...)
	targetKey = append(targetKey, '.') // separator
	targetKey = append(targetKey, []byte(iface)...)
	targetKey = append(targetKey, '.') // separator
	targetKey = append(targetKey, []byte(mac)...)

	// Convert verdict string to VerdictKind
	var verdictKind expr.VerdictKind
	switch verdict {
	case "accept":
		verdictKind = expr.VerdictAccept
	case "drop":
		verdictKind = expr.VerdictDrop
	case "continue":
		verdictKind = expr.VerdictContinue
	case "return":
		verdictKind = expr.VerdictReturn
	default:
		return false, fmt.Errorf("unsupported verdict: %s", verdict)
	}

	// Look for matching element
	for _, elem := range elements {
		if len(elem.Key) != len(targetKey) {
			continue
		}
		if string(elem.Key) != string(targetKey) {
			continue
		}

		if elem.VerdictData != nil && elem.VerdictData.Kind == verdictKind {
			return true, nil
		}
	}

	return false, nil
}

func (m *NFTablesManager) HasCustomVerdict(zoneName, ip, iface string) (error, bool) {
	/*
		err := exec.Command("nft", "get", "element", "inet", "filter", ZoneName+"_dst_access", "{", IP, ".", Iface, ":", "continue", "}").Run()
		if err == nil {
			err = exec.Command("nft", "get", "element", "inet", "filter", ZoneName+"_src_access", "{", IP, ".", Iface, ":", "accept", "}").Run()
			return err == nil
		}
		return false

	*/

	m.mu.Lock()
	defer m.mu.Unlock()

	// First check the dst_access set
	dstExists, err := m.getElementVerdict(
		zoneName+"_dst_access",
		ip,
		iface,
		expr.VerdictContinue,
	)
	if err != nil {
		return fmt.Errorf("checking dst_access: %w", err), false
	}

	if !dstExists {
		return nil, false
	}

	// Then check the src_access set
	srcExists, err := m.getElementVerdict(
		zoneName+"_src_access",
		ip,
		iface,
		expr.VerdictAccept,
	)
	if err != nil {
		return fmt.Errorf("checking src_access: %w", err), false
	}

	return nil, srcExists
}

func (m *NFTablesManager) getElementVerdict(setName, ip, iface string, verdict expr.VerdictKind) (bool, error) {
	// Parse the IP address
	ipAddr := net.ParseIP(ip)
	if ipAddr == nil {
		return false, fmt.Errorf("invalid IP address: %s", ip)
	}

	// Get the set
	set, err := m.conn.GetSetByName(&nftables.Table{
		Family: nftables.TableFamilyINet,
		Name:   "filter",
	}, setName)
	if err != nil {
		return false, fmt.Errorf("getting set %s: %w", setName, err)
	}
	if set == nil {
		return false, fmt.Errorf("set %s not found", setName)
	}

	// Get all elements from the set
	elements, err := m.conn.GetSetElements(set)
	if err != nil {
		return false, fmt.Errorf("getting elements from set %s: %w", setName, err)
	}

	// Create the key we're looking for
	targetKey := make([]byte, 0)
	targetKey = append(targetKey, ipAddr.To4()...)
	targetKey = append(targetKey, '.') // separator
	targetKey = append(targetKey, []byte(iface)...)

	// Look for matching element
	for _, elem := range elements {
		if len(elem.Key) == len(targetKey) && string(elem.Key) == string(targetKey) {
			// Check if the verdict matches what we're looking for
			if elem.VerdictData != nil && elem.VerdictData.Kind == expr.VerdictKind(verdict) {
				return true, nil
			}
		}
	}

	return false, nil
}

// nftables.TableFamilyINet, "mangle",
// /	cmd := exec.Command("nft", "flush", "chain", "inet", "mangle", "OUTBOUND_UPLINK")
func (m *NFTablesManager) FlushChain(family nftables.TableFamily, familyName string, chainName string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	chain := &nftables.Chain{
		Name: chainName,
		Table: &nftables.Table{
			Family: family,
			Name:   familyName,
		},
	}

	m.conn.FlushChain(chain)

	if err := m.conn.Flush(); err != nil {
		return fmt.Errorf("failed to flush chain: %v", err)
	}

	return nil
}

/*
func main() {
    manager, err := NewNFTablesManager()
    if err != nil {
        panic(err)
    }

    // Use the manager throughout your application
    if err := manager.FlushChain("OUTBOUND_UPLINK"); err != nil {
        fmt.Printf("Error flushing chain: %v\n", err)
    }
}
*/
