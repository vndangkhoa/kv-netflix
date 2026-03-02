package main

import (	
	"crypto/tls"
	"fmt"
	"net/http"
	"time"
)

func main() {
	tr := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	}
	client := &http.Client{
		Transport: tr,
		Timeout:   15 * time.Second,
	}

	url := "https://www.google.com/favicon.ico"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		fmt.Printf("err: %v\n", err)
		return
	}
	
	resp, err := client.Do(req)
	if err != nil {
		fmt.Printf("do err: %v\n", err)
		return
	}
	fmt.Printf("status: %d\n", resp.StatusCode)
}
