<?php
    $json = file_get_contents('https://data.austintexas.gov/api/views/b4y9-5x39/rows.json?accessType=DOWNLOAD'); // Get raw data from stream
    $obj = json_decode($json); // Decode JSON format into PHP-useable object
    $data = $obj->data; // Get data array from response
    $incident = "";
    
    file_put_contents("incidents.txt", "");
    
    $file = fopen("incidents.txt", 'a+'); // Wipe existing incidents file for rewriting
    
    for ($i = 0; $i < sizeof($data); $i++) {
        $address = geocode($data[$i][13]); // Geocode address
        if ($address) { // If address geocoded correctly
    
            // Write out data in specified JSON format
            $incident = "{\"crime_type\": \"{$data[$i][9]}\"," .
                          "\"time\": \"{$data[$i][11]}\"," .
                          "\"lat\": \"{$address[0]}\"," .
                          "\"lng\": \"{$address[1]}\"," .
                          "\"date\": {$data[$i][10]}}";
            if ($i < sizeof($data)) { // If not last entry
                $incident = $incident . "|"; // Add delimiter
            }
            fwrite($file, $incident); // Append new incident to incidents file
        }
    }
    
    fclose($file);
    
    function geocode($address) {
        $address = urlencode($address); // Make string url-safe
        $url = "http://maps.google.com/maps/api/geocode/json?sensor=false&address={$address}%20AUSTIN%20TX"; // Geocode api url
        $resp_json = file_get_contents($url); // Get response
        $resp = json_decode($resp_json, true); // Convert json response to PHP-readable
        if($resp['status']=='OK') { // If API returned OK
            // Set Latitude and Longitude from response
            $lat = $resp['results'][0]['geometry']['location']['lat'];
            $lng = $resp['results'][0]['geometry']['location']['lng'];
            if($lat && $lng) { // If lat and lng created ok
                $data_arr = array();
                array_push($data_arr, $lat, $lng);
                return $data_arr;
            } else {
                return false; // Latitude & Longitude not created OK
            }
        } else {
            return false; // API response not OK
        }
    }
?>