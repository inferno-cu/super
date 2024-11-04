package main

import (
	"testing"
)

func getRouteInterfaceOld(IP string) string {
	routes := []RouteEntry{}

	cmd := exec.Command("ip", "-j", "route", "get", IP)
	output, err := cmd.Output()

	if err != nil {
		return ""
	}

	err = json.Unmarshal(output, &routes)
	if err != nil {
		log.Println(err)
		return ""
	}

	if len(routes) == 1 {
		return routes[0].Dev
	}

	return ""
}

func getRouteGatewayForTableOld(Table string) string {
	routes := []RouteEntry{}

	cmd := exec.Command("ip", "-j", "route", "show", "table", Table)
	output, err := cmd.Output()

	if err != nil {
		return ""
	}

	err = json.Unmarshal(output, &routes)
	if err != nil {
		log.Println(err)
		return ""
	}

	if len(routes) == 1 {
		return routes[0].Gateway
	}

	return ""
}


func addInternetVerdictOld(IP string, Iface string) {
	err := exec.Command("nft", "add", "element", "inet", "filter",
		"internet_access", "{", IP, ".", Iface, ":", getMapVerdict("internet_access"), "}").Run()
	if err != nil {
		log.Println("addVerdict Failed", Iface, "internet_access", err)
		return
	}
}

func addDNSVerdictOld(IP string, Iface string) {
	addVerdict(IP, Iface, "dns_access")
}

func addLANVerdictOld(IP string, Iface string) {
	addVerdict(IP, Iface, "lan_access")
}


func hasCustomVerdictOld(ZoneName string, IP string, Iface string) bool {
  err := exec.Command("nft", "get", "element", "inet", "filter", ZoneName+"_dst_access", "{", IP, ".", Iface, ":", "continue", "}").Run()
  if err == nil {
    err = exec.Command("nft", "get", "element", "inet", "filter", ZoneName+"_src_access", "{", IP, ".", Iface, ":", "accept", "}").Run()
    return err == nil
  }
  return false
}


func hasVerdictMaOld(IP string, MAC string, Iface string, Table string, Verdict string) bool {
  err := exec.Command("nft", "get", "element", "inet", "filter", Table, "{", IP, ".", Iface, ".", MAC, ":", Verdict, "}").Run()
  return err == nil
}
