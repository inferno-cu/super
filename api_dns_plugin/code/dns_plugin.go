package main

import (
	"fmt"
	"net"
	"net/http"
	"os"
)

//DHCPmtx.Lock()
//defer DHCPmtx.Unlock()

import (
	"github.com/gorilla/mux"
)

var UNIX_PLUGIN_LISTENER = "./state/api/dns_plugin"

func pluginTest(w http.ResponseWriter, r *http.Request) {
	//Handle networking tasks upon a DHCP

	http.Error(w, "Not implemented", 400)
}

func logRequest(handler http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fmt.Printf("%s %s %s\n", r.RemoteAddr, r.Method, r.URL)
		handler.ServeHTTP(w, r)
	})
}

func main() {
	unix_plugin_router := mux.NewRouter().StrictSlash(true)

	// DHCP actions
	unix_plugin_router.HandleFunc("/test", pluginTest).Methods("GET")

	os.Remove(UNIX_PLUGIN_LISTENER)
	unixPluginListener, err := net.Listen("unix", UNIX_PLUGIN_LISTENER)
	if err != nil {
		panic(err)
	}

	pluginServer := http.Server{Handler: logRequest(unix_plugin_router)}

	pluginServer.Serve(unixPluginListener)
}
