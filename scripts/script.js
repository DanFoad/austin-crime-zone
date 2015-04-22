// Global variables
var map; // Main map object
var url = "https://data.austintexas.gov/resource/b4y9-5x39.json?%24select=crime_type%2Ctime%2Caddress"; // Address of JSON incident feeds
var markers = []; // Marker array of user markers
var incidents = []; // Incidents array of all incidents
var points = []; // Array containing LatLng representation that can be displayed on map
var search; // Autocomplete object to allow location searching
var categories = ["THEFT", "VANDALISM", "ATTACKS", "ECONOMIC", "SEX", "SUBSTANCES", "OTHER"];
var categoryTypes = {
	"THEFT" : ["THEFT FROM PERSON", "THEFT OF BICYCLE", "BURGLARY INFORMATION", "BURGLARY OF VEHICLE", "THEFT OF SERVICE", "THEFT OF AUTO PARTS", "BURGLARY NON RESIDENCE", "BURG NON RESIDENCE SHEDS", "AUTO THEFT", "THEFT INFORMATION", "BURGLARY OF RESIDENCE", "THEFT BY SHOPLIFTING", "THEFT OF VEHICLE/OTHER", "IDENTITY THEFT", "THEFT OF LICENSE PLATE", "THEFT FROM BUILDING", "OUT OF CITY AUTO THEFT", "AUTO THEFT INFORMATION", "ROBBERY BY ASSAULT", "BURGLARY OF VEH INFORMATION", "THEFT OF METAL", "THEFT FROM AUTO", "THEFT OF HEAVY EQUIPMENT", "OUT OF CITY IDENTITY THEFT"],
	"VANDALISM": ["GRAFFITI", "CRIMINAL TRESPASS NOTICE", "CRIMINAL TRESPASS/TRANSIENT", "CRASH/ACCIDENT/PRIVATE PROP", "TAMPERING WITH EVIDENCE", "BREACH OF COMPUTER SECURITY"],
	"ATTACKS": ["ASSAULT BY CONTACT", "ASSAULT W/INJURY-FAM/DATE VIOL", "AGG ASSAULT", "AGG ASSAULT FAM/DATE VIOLENCE", "ASSAULT BY CONTACT FAM/DATING", "AGG ASLT STRANGLE/SUFFOCATE", "TERRORISTIC THREAT", "ASSAULT WITH INJURY", "FEDERAL VIOL/OTHER", "AGG ASSAULT WITH MOTOR VEH", "INJ TO ELDERLY   FAM/DATE VIOL", "CRUELTY TO ANIMALS", "ASSAULT BY THREAT FAM/DATING", "ASSAULT ON PUBLIC SERVANT", "AGG ROBBERY/DEADLY WEAPON", "SHOTS FIRED", "AGG ASLT ENHANC STRANGL/SUFFOC", "DEADLY CONDUCT"],
	"ECONOMIC": ["DEBIT CARD ABUSE", "FRAUD DESTRUCTION OF A WRITING", "CRED CARD ABUSE - OTHER", "FRAUD - OTHER", "FORGERY - OTHER", "FORGERY AND PASSING", "OUT OF CITY CREDIT CARD ABUSE", "FORGERY BY ALTERATION"],
	"SEX": ["REG. SEX OFFENDER INFORMATION", "SEXUAL ASSAULT INFORMATION", "PROSTITUTION", "INDECENT EXPOSURE", "URINATING IN PUBLIC PLACE", "STALKING INFORMATION", "HARASSMENT", "OUT OF CITY SEXUAL ASSAULT"],
	"SUBSTANCES": ["POSS OF DRUG PARAPHERNALIA", "PUBLIC INTOXICATION", "DWI", "POSS CONTROLLED SUB/NARCOTIC", "POSS MARIJUANA", "DWI  .15 BAC OR ABOVE", "DWI 2ND", "POSS CONTROLLED SUB/SYN NARC", "DRIVING WHILE INTOX / FELONY", "FOUND CONTROLLED SUBSTANCE"],
	"OTHER": ["DRIVING WHILE LICENSE INVALID", "CRIMINAL MISCHIEF", "DISTURBANCE - OTHER", "FAMILY DISTURBANCE", "DATING DISTURBANCE", "FAILURE TO IDENTIFY", "INTERFER W/PO SERVICE ANIMALS", "CRIMINAL MISCHIEF INFORMATION", "FAMILY DISTURBANCE/PARENTAL", "POSS OF PROHIBITED WEAPON", "TRAFFIC VIOL/OTHER", "UNLAWFUL CARRYING WEAPON", "DRIVERS LICENSE VIOL/OTHER"]
};
// Boundary for map panning to prevent user scrolling too far away from Austin and limit search
var panBounds = new google.maps.LatLngBounds(
	new google.maps.LatLng(30.087883, -98.039046),
	new google.maps.LatLng(30.541183, -97.465843)
);
// Defaults for autocomplete search
var searchOptions = {
	bounds: panBounds,
	types: ["address"],
	componentRestrictions: {country: "us"}
};
// Icon for incidents
var incidentImage = new google.maps.MarkerImage("../style/incidentImage.png",
	null,
	new google.maps.Point(0,0), // origin
	new google.maps.Point(8,8)); // centre
// Icon for user's marker
var userImage = new google.maps.MarkerImage("../style/userImage.png",
	null,
	new google.maps.Point(0,0),
	new google.maps.Point(8,8));
// Icon for resize marker
var resizeImage = new google.maps.MarkerImage("../style/resizeImage.png",
	null,
	new google.maps.Point(0,0),
	new google.maps.Point(11,6));
// Defaults for user position marker
markers["user"] = new google.maps.Marker({
	icon: userImage,
	zIndex: 9999
});
// Defaults for circle zone marker
markers["circle"] = new google.maps.Circle({
	strokeOpacity: 0,
	fillOpacity: 0.35,
	radius: radius,
	clickable: false,
	zIndex: 9998
});
// Defaults for zone resize marker
markers["resize"] = new google.maps.Marker({
	draggable: true,
	icon: resizeImage,
	zIndex: 9999
});
// Info window constructor
var infoWindow = new google.maps.InfoWindow();

// API settings
$.ajaxSetup({async: false}); // Prevent asynchronous ajax loading so system waits for response
$.cookie.json = true; // Allow storage of JSON objects as cookie

// Defaults
var incidentsDisplayed = false;
var resizing = false; // Whether the user is currently resizing the zone
var time = 1;
var checkedAll = true;
var radius = 5000;
var minRadius = 1000;
var maxRadius = 10000;
var zoom = 12;
var lat;
var lng;
var mapOptions = {
	center: new google.maps.LatLng(30.2500, -97.7500),
	zoom: zoom,
	minZoom: 11,
	disableDefaultUI: true,
	// Styling to remove POI labels and mute road colours
	styles: [{"stylers":[{"saturation":0}]},{"featureType":"road","elementType":"geometry","stylers":[{"lightness":200},{"visibility":"simplified"}]},{"featureType":"road","elementType":"labels","stylers":[{"visibility":"simplified"}]},{"featureType":"administrative","elementType":"labels","stylers":[{"visibility":"simplified"}]},{"featureType":"poi","elementType":"labels","stylers":[{"visibility":"simplified"},{"saturation":45}]},{"featureType":"water","elementType":"labels","stylers":[{"visibility":"simplified"},{"saturation":-45}]},{"featureType":"water","elementType":"geometry","stylers":[{"visibility":"simplified"},{"saturation":45}]},{"featureType":"landscape","elementType":"labels","stylers":[{"visibility":"simplified"},{"saturation":45}]},{"featureType":"transit","elementType":"labels","stylers":[{"visibility":"simplified"},{"saturation":45}]},{featureType: "poi",elementType: "labels",stylers: [{ visibility: "off" }]}]
};
// Settings JSON object for cookie storage
var settings = {
	"location": {
		"lat": lat,
		"lng": lng
	},
	"categories": categories,
	"time": time,
	"zoom": zoom,
	"radius": radius,
	"incidentsDisplayed": incidentsDisplayed
};

/** initialise
 * Initialise the map with defaults or previous settings if available
 */
function initialise() {
	// Get values from cookie
    if ($.cookie("settings") !== undefined) {
    	setSettings($.cookie("settings"));
    } else {
    	updateSettings();
    }
    
    // Initialise map object with relevant options
    map = new google.maps.Map(document.getElementById("map__canvas"), mapOptions);
    var outline = new google.maps.KmlLayer({
    	url: "http://comp4.danfoad.co.uk/style/outline.kml?v=10",
    	map: map,
    	preserveViewport: true,
    	suppressInfoWindows: true
    });
    
    // Add custom zoom controls to map
    var zoomControlDiv = document.createElement("div");
    zoomControlDiv.index = 20; // Keep above points on map
    var zoomInControl = new ZoomInControl(zoomControlDiv, map);
    var zoomOutControl = new ZoomOutControl(zoomControlDiv, map);
    map.controls[google.maps.ControlPosition.TOP_RIGHT].push(zoomControlDiv); // Apply zoom controls
    
    // Get all incidents and add to array
    incidents = getIncidents();
    
    // Initialise points and display if necessary
    initialisePoints();
    if (incidentsDisplayed) displayIncidents();
    
    // Place user marker if necessary
   	placeMarker(new google.maps.LatLng(lat, lng));
   	
   	// Add search options to search bar
   	search = new google.maps.places.Autocomplete(document.getElementById("map__searchInput"), searchOptions);
    
    // Add Listeners and handler functions to map
    google.maps.event.addListener(map, "click", function(event) { placeMarker(event.latLng) });
    google.maps.event.addListener(map, "dragend", checkPan);
    google.maps.event.addListener(map, "zoom_changed", zoomListener);
    google.maps.event.addListener(markers["resize"], "drag", updateResizeMarker);
	google.maps.event.addListener(markers["resize"], "dragend", updateResizeMarker);
	google.maps.event.addListener(search, "place_changed", function() {
		placeMarker(search.getPlace().geometry.location); // Go to searched place
		$("#map__searchInput").blur(); // Remove focus from search bar
	});
	
	// Remove loader when map is loader
	google.maps.event.addListener(map, "idle", function() {
		$("#loader").fadeOut();
	});
}
google.maps.event.addDomListener(window, "load", initialise);

/** ZoomInControl
 * Create a zoom-in control object and apply to map object
 * @param {Object} controlDiv Div element that will hold the created control
 */
function ZoomInControl(controlDiv, map) {
	controlDiv.style.padding = "5px"; // Apply padding around element
	var controlUI = document.createElement("div");
	$(controlUI).addClass("map__zoomControl");
	controlUI.style.marginBottom = "5px";
	if (map.getZoom() == 19) controlUI.style.visibility = "hidden"; // Hide control if zoomed in fully
	controlUI.innerHTML = "&#xf067;"; // + Symbol in FontAwesome
	controlDiv.appendChild(controlUI);
	google.maps.event.addDomListener(controlUI, "click", function() { // Zoom in
		map.setZoom(map.getZoom() + 1);
	});
}

/** ZoomOutControl
 * Create a zoom-out control object and apply to map object
 * @param {Object} controlDiv Div element that will hold the created control
 */
function ZoomOutControl(controlDiv, map) {
	controlDiv.style.padding = "5px"; // Apply padding around element
	var controlUI = document.createElement("div");
	$(controlUI).addClass("map__zoomControl");
	if (map.getZoom() <= 11) controlUI.style.visibility = "hidden"; // Hide control if zoomed out fully
	controlUI.innerHTML = "&#xf068;"; // - Symbol in FontAwesome
	controlDiv.appendChild(controlUI);
	google.maps.event.addDomListener(controlUI, "click", function() { // Zoom out
		map.setZoom(map.getZoom() - 1);
	});
}

/** getIncidents
 * Read in incident objects from incidents.txt and convert to array
 * @return {Array.<Object>} tmpIncidents Array containing all incidents read in from file
 */
function getIncidents() {
	var url = "incidents.txt";
	var file = new XMLHttpRequest();
	var raw = "";
	var tmpIncidents = [];
	file.open("GET", url, false); // Open file
	file.onreadystatechange = function() {
		if (file.readyState === 4 && (file.status === 200 || file.status === 0)) { // If file opened fine
			raw = file.responseText;
			raw = raw.split("|"); // Split raw feed into different incidents
			for (var i in raw) {
				tmpIncidents.push(JSON.parse(raw[i]));
			}
		}
	};
	file.send(null); // Close file
	return tmpIncidents;
}

/** initialisePoints
 * Get all incidents that conform to settings and add to points array to be applied to map
 */
function initialisePoints() {
	for (var i in points) points[i].setMap(null); // Remove all previous points from map before reinitialising
	points = [];
	var point;
	for (var i in incidents) {
		if (checkTime(incidents[i].time) && checkCategory(incidents[i].crime_type)) { // If incidents fits settings
			point = new google.maps.Marker({ // Create new incident point
				position: new google.maps.LatLng(incidents[i].lat, incidents[i].lng),
				map: map,
				visible: incidentsDisplayed,
				icon: incidentImage,
				zIndex: 10
			});
			point.date = new Date(incidents[i].date * 1000); // Convert date to milliseconds
			point.crime_type = incidents[i].crime_type;
			bindInfoWindow(point);
			points.push(point); // Fill global variable
		}
	}
}

/** bindInfoWindow
 * Bind click event to each incident marker
 * @param {Object} marker Marker object to bind click event to
 */
function bindInfoWindow(marker) {
	google.maps.event.addListener(marker, "click", function() {
		infoWindow.setOptions({
			content: marker.crime_type + " occured on " + marker.date.toLocaleDateString() + " at " + marker.date.toLocaleTimeString()
		});
		infoWindow.open(map, marker);
	});
}


/** placeMarker
 * Checks whether a given position is within Austin and places the user's marker there
 * @param {Object} location LatLng representation of the selected location
 */
function placeMarker(location) {
	if (isNaN(location.lat()) || isNaN(location.lng())) return false; // If no location defined
	var locationInfo = "https://maps.googleapis.com/maps/api/geocode/json?latlng="+location.lat()+","+location.lng()+"&sensor=false";
	$.getJSON(locationInfo, function(data, textstatus) {
		var isAustin = false;
		// Check if chosen location is within Austin, TX
		for (var i = 0; i < data.results[0].address_components.length; i++) {
			var longname = data.results[0].address_components[i].long_name;
			var type = data.results[0].address_components[i].types;
			if (type.indexOf("locality") !== -1 && longname == "Austin") {
				isAustin = true;
				break;
			}
		}
		if (isAustin) {
			// Apply markers to map
			markers["user"].setMap(map);
			markers["user"].setPosition(location);
			updateCircle(location);
			map.panTo(location);
			map.setCenter(location);
			map.fitBounds(markers["circle"].getBounds()); // Zoom to relevant depth
			zoom = map.getZoom();
			lat = location.lat();
			lng = location.lng();
			updateSettings();
		} else { // If chosen point is not in Austin
			alert("Please choose somewhere within Austin, TX");
		}
	});
}

/** getZoneColour
 * Calculate the RGB representation the zone should take on
 * @param {Object} center LatLng representation of the point to take incidents around
 * @return {String} RGB representation of the colour the zone should be
 */
function getZoneColour(center) {
	if (points.length === 0) return "rgb(0,0,0)";
	var incidentCount = getIncidentsInRange(center);
	var stdCount = (incidentCount / points.length); // Normalise incident count
	var stdZone = ((radius - minRadius) / (maxRadius - minRadius)); // Normalise radius
	var percent = Math.floor((stdCount / ((stdZone + 0.02) * 0.9)) * 100); // Calculate percentage

	// Convert percentage into RGB representation
	var g = percent<50 ? 255 : Math.floor(255-(percent*2-100)*255/100);
    var r = percent>50 ? 255 : Math.floor((percent*2)*255/100);
    
    if (g < 0) g = 0;
    if (r < 0) r = 0;
    
    return "rgb("+ r + "," + g + ",0)";
}

/** getIncidentsInRange
 * Calculate how many incidents are within the radius of the selected point
 * @param {Object} center LatLng representation of the point to take incidents around
 * @return {Number} count The number of incidents within the given radius
 */
function getIncidentsInRange(center) {
	var count = 0;
	for (var i = 0; i < points.length; i++) { // Increment count for each point in zone
		var distance = getDistance(points[i].position, center);
		if (distance <= radius) count++;
	}
	return count;
}

/** rad
 * Convert decimal to radians
 * @param {Number} x The decimal to convert
 * @return {Number} The radian equivalent of the decimal
 */
function rad(x) {
	return x * Math.PI / 180;
}

/** getDistance
 * Get the distance between two latitude/longitude points in metres using Haversine formula
 * @param {Object} p1 LatLng representation of first point
 * @param {Object} p2 LatLng representation of second point
 * @return {Number} d Number of metres between the two points
 */
function getDistance(p1, p2) {
	var R = 6378137; // Radius of Earth (metres)
	var dLat = rad(p2.lat() - p1.lat());
	var dLong = rad(p2.lng() - p1.lng());
	var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(rad(p1.lat())) * Math.cos(rad(p2.lat())) *
			Math.sin(dLong / 2) * Math.sin(dLong / 2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	var d = R * c;
	return d; // In metres
}

/** checkTime
 * Check an incident's time against the time settings to see if it should be included
 * @param {Integer} incidentTime The time of the incident to be compared to setting
 * @return {Boolean} ret Whether the given incident conforms to the time setting
 */
function checkTime(incidentTime) {
	var ret = false;
	switch(time) {
		case 0: // Day only
			if (incidentTime >= 600 && incidentTime <= 1800) ret = true; break;
		case 1: // Day and night
			ret = true; break;
		case 2: // Night only
			if (incidentTime > 1800 || incidentTime < 600) ret = true; break;
	}
	return ret;
}

/** checkCategory
 * Check an incident's crime type against the category settings to see if it should be included
 * @param {String} incidentType The type of crime of the given incident
 * @return {Boolean} Whether the given incident conforms to the category setting
 */
function checkCategory(incidentType) {
	if (categories.indexOf("THEFT") !== -1) {
		if (categoryTypes.THEFT.indexOf(incidentType) !== -1) return true;
	}
	if (categories.indexOf("VANDALISM") !== -1) {
		if (categoryTypes.VANDALISM.indexOf(incidentType) !== -1) return true;
	}
	if (categories.indexOf("ATTACKS") !== -1) {
		if (categoryTypes.ATTACKS.indexOf(incidentType) !== -1) return true;
	}
	if (categories.indexOf("ECONOMIC") !== -1) {
		if (categoryTypes.ECONOMIC.indexOf(incidentType) !== -1) return true;
	}
	if (categories.indexOf("SEX") !== -1) {
		if (categoryTypes.SEX.indexOf(incidentType) !== -1) return true;
	}
	if (categories.indexOf("SUBSTANCES") !== -1) {
		if (categoryTypes.SUBSTANCES.indexOf(incidentType) !== -1) return true;
	}
	if (categories.indexOf("OTHER") !== -1) {
		if (categoryTypes.OTHER.indexOf(incidentType) !== -1) return true;
	}
	return false;
}


//**** EVENT HANDLERS/LISTENERS ****//

/** setSettings
 * Read in cookie settings and apply to global variables
 * @param {Object} cookieSettings JSON representation of settings
 */ 
function setSettings(cookieSettings) {
	// Set values of global variables
	settings = cookieSettings;
	incidentsDisplayed = settings.incidentsDisplayed;
	time = settings.time;
	radius = settings.radius;
	zoom = settings.zoom;
	lat = settings.location.lat;
	lng = settings.location.lng;
	categories = settings.categories;
	mapOptions.zoom = zoom;
	
	// Set values on DOM elements
	$("#settings__zoneRadius").val(radius);
	$("#settings__time").val(time);
	$("#type__theft").prop("checked", (categories.indexOf("THEFT") !== -1));
	$("#type__vandalism").prop("checked", (categories.indexOf("VANDALISM") !== -1));
	$("#type__attacks").prop("checked", (categories.indexOf("ATTACKS") !== -1));
	$("#type__economic").prop("checked", (categories.indexOf("ECONOMIC") !== -1));
	$("#type__sex").prop("checked", (categories.indexOf("SEX") !== -1));
	$("#type__substances").prop("checked", (categories.indexOf("SUBSTANCES") !== -1));
	$("#type__other").prop("checked", (categories.indexOf("OTHER") !== -1));
}

/** updateSettings
 * Update settings variable with new values, reinitialise zone circle and save to cookie
 */
function updateSettings() {
	updateCircle(new google.maps.LatLng(lat, lng));
	settings = {
		"location": {
			"lat": lat,
			"lng": lng
		},
		"categories": categories,
		"time": time,
		"zoom": zoom,
		"radius": radius,
		"incidentsDisplayed": incidentsDisplayed
	};
	$.cookie("settings", settings, {expires: 365}); // Set/Update cookie with new values
}

/** updateCategories
 * Update the categories specified by the user and reinitialise points array
 */
function updateCategories() {
	categories = [];
	if ($("#type__theft").prop("checked")) categories.push("THEFT");
	if ($("#type__vandalism").prop("checked")) categories.push("VANDALISM");
	if ($("#type__attacks").prop("checked")) categories.push("ATTACKS");
	if ($("#type__economic").prop("checked")) categories.push("ECONOMIC");
	if ($("#type__sex").prop("checked")) categories.push("SEX");
	if ($("#type__substances").prop("checked")) categories.push("SUBSTANCES");
	if ($("#type__other").prop("checked")) categories.push("OTHER");
	if (categories.length === 0) { // If no categories specified
		$("#settings__toggleTypes").html("Select All");
	} else if (categories.length == 7) { // If all categories specified
		$("#settings__toggleTypes").html("Deselect All");
	}
	initialisePoints();
	updateSettings();
}

/** updateCircle
 * Update the position, radius and colour of circle to relevant values
 */
function updateCircle(location) {
	if (!resizing) { // If user isn't currently resizing zone circle
		// Apply resize marker to relevant position
		var loc = new google.maps.LatLng(location.lat(), (location.lng() + 0.000010416*radius)); // 0.000010416 is around 1m in Austin
		markers["resize"].setOptions({
			map: map,
			position: loc
		});
	}
	// Apply circle marker to relevant position, radius and zone colour
	markers["circle"].setOptions({
		center: location,
		radius: radius,
		map: map,
		fillColor: getZoneColour(location)
	});
}

/** updateResizeMarker
 * Handle resizing of the resize marker at edge of circle on drag
 * @param {Object} point Event object that contains LatLng of mouse position
 */
function updateResizeMarker(point) {
	resizing = true; // User is currently resizing zone
	var newPoint = new google.maps.LatLng(markers["circle"].center.lat(), point.latLng.lng()); // Keep marker on same horizontal line
	var newRadius = getDistance(newPoint, markers["circle"].center);
	// Prevent circle getting too large or small
	if (newRadius < minRadius) newRadius = minRadius;
	if (newRadius > maxRadius) newRadius = maxRadius;
	// Move resize marker to mouse position
	markers["resize"].setPosition(new google.maps.LatLng(markers["circle"].center.lat(), (markers["circle"].center.lng() + 0.000010416*newRadius)));
	radius = Math.round(newRadius);
	updateSettings();
	$("#settings__zoneRadius").val(radius); // Update DOM element
	resizing = false; // User is no longer resizing zone
}

/** reset
 * Reset settings to default values
 */
function reset() {
	// Set global variables to defaults
	lat = undefined;
	lng = undefined;
	categories = ["THEFT", "VANDALISM", "ATTACKS", "ECONOMIC", "SEX", "SUBSTANCES", "OTHER"];
	time = 1;
	zoom = 12;
	radius = 5000;
	incidentsDisplayed = false;
	map.panTo(new google.maps.LatLng(30.2500, -97.7500));
	map.setZoom(zoom);
	hideIncidents();
	
	// Set DOM element values to defaults
	$(".settings__switch input").each(function() {
		$(this).prop("checked", true);
	});
	$("#settings__zoneRadius").val(radius);
	$("#settings__time").val(time);
	$("#map__searchInput").val("");
	
	// Remove markers from map
	markers["user"].setMap(null);
	markers["circle"].setMap(null);
	markers["resize"].setMap(null);
	
	// Save defaults
	updateSettings();
	initialisePoints();
}

/** toggleIncidents
 * Hide or display incident points depending on current value set
 */
function toggleIncidents() {
	if (incidentsDisplayed) {
		hideIncidents();
		incidentsDisplayed = false;
	} else {
		displayIncidents();
		incidentsDisplayed = true;
	}
	updateSettings();
}

function displayIncidents() {
	for (i in points) {
		points[i].setVisible(true);
	}
	$("#settings__toggleIncidents").html("<i class=\"fa fa-eye-slash\"></i> Hide All Incidents");
}

function hideIncidents() {
	for (i in points) {
		points[i].setVisible(false);
	}
	infoWindow.close();
	$("#settings__toggleIncidents").html("<i class=\"fa fa-eye\"></i> Show All Incidents");
}

/** zoomListener
 * Handle change in zoom on map and store new zoom in settings list
 */
function zoomListener() {
	zoom = map.getZoom();
	settings.zoom = zoom;
	if (zoom <= 11) { // If zoomed out fully
		$(".map__zoomControl").last().css("visibility", "hidden"); // Hide zoomOutControl
	} else if (zoom >= 19) { // If zoomed in fully
		$(".map__zoomControl").first().css("visibility", "hidden"); // Hide zoomInControl
	} else {
		$(".map__zoomControl").css("visibility", "visible"); // Set both zoom controls visible
	}
	updateSettings();
}

/** checkPan
 * Handle keeping the map within the bounds of Austin, TX
 */
function checkPan() {
	if (!panBounds.contains(map.getCenter())) { // If new pan position is within bounds
		var c = map.getCenter(),
			x = c.lat(),
			y = c.lng(),
			maxY = panBounds.getNorthEast().lng(),
			maxX = panBounds.getNorthEast().lat(),
			minY = panBounds.getSouthWest().lng(),
			minX = panBounds.getSouthWest().lat();
		
		// If outside bounds, move to edge of bounds
		if (y < minY) y = minY;
		if (y > maxY) y = maxY;
		if (x < minX) x = minX;
		if (x > maxX) x = maxX;
		
		map.panTo(new google.maps.LatLng(x, y)); // Allow pan
	}
}

/* $() is equivalent to jQuery() */

/**
 * Handle opening and closing of the menu
 */
$("#overlay").click(function() {
	$(".button--settings").first().trigger("click"); // Close menu on overlay click
});

$(".button--settings").click(function() {
	$("#overlay").toggle();
	$(".button--settings").each(function() {
		$(this).toggle();
	});
	if (parseInt($("#sidebar").css('left'),10) === 0) {
		$("#sidebar").animate({ // Hide sidebar
			left: "-240px"
		});
		$("header").animate({
			paddingLeft: 0 // Move header back to regular position
		});
	} else {
		$("#sidebar").animate({
			left: 0 // Show sidebar
		});
		$("header").animate({
			paddingLeft: "240px" // Move header relative to sidebar
		});
	}
});

$("#settings__getLocation").click(function() {
	if (navigator.geolocation) { // If browser supports geolocation
		navigator.geolocation.getCurrentPosition(function(position) { // Success
			var point = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			placeMarker(point);
		}, function(error) { // Failure
			switch (error.code) {
				case error.PERMISSION_DENIED:
					alert("User denied the request for Geolocation.");
					break;
				case error.POSITION_UNAVAILABLE:
					alert("Location information is unavailable.");
					break;
				case error.TIMEOUT:
					alert("The request to get user location timed out.");
					break;
				case error.UNKNOWN_ERROR:
					alert("An unknown error occurred.");
					break;
			}
		});
	} else {
		alert("Geolocation is not supported by this browser.");
	}
});

/**
 * Handle click of Display/Hide all incidents
 */
$("#settings__toggleIncidents").click(toggleIncidents);

$("#settings__zoneRadius").submit(function() {
	var val = parseInt($(this).val());
	if (val >= minRadius && val <= maxRadius) { // Make sure specified radius is valid
		radius = val;
		updateSettings();
	} else {
		alert("Please enter a value between " + minRadius + " and " + maxRadius +  ".");
	}
	if (!(isNaN(lat) || isNaN(lng))) { // If location already specified
		updateCircle(new google.maps.LatLng(lat, lng)); // Update circle to new radius
	}
});
$("#settings__zoneRadius").keypress(function(e) {
	if (e.which == 10 || e.which == 13) { // If enter key pressed, simulate submission
		$(this).submit();
	}
});
$("#settings__setRadius").click(function() {
	$("#settings__zoneRadius").submit(); // Apply submit to zoneRadius input
});

/**
 * Handle click of selecting/deselecting of category types types
 */
$("#settings__toggleTypes").click(function() {
	if (checkedAll) {
		$("input[id^=type__]").prop("checked", false);
		$(this).html("Select All");
		checkedAll = false;
	} else {
		$("input[id^=type__]").prop("checked", true);
		$(this).html("Deselect All");
		checkedAll = true;
	}
	updateCategories();
});

$(".settings__switch").change(updateCategories);

/**
 * Handle change in time setting
 */
$("#settings__time").on("change", function() {
	time = parseInt($(this).val());
	initialisePoints();
	updateSettings();
});

/**
 * Handle click of reset button
 */
$("#settings__reset").click(reset);

/**
 * Remove non-Austin results from search menu
 */
document.addEventListener("DOMNodeInserted", function(event) {
	var target = $(event.target);
	if (target.hasClass("pac-item")) { // If element in search menu
		if (target.html().indexOf("Austin, TX") == -1) { // If not in Austin
			target.hide();
		} else {
			// Remove superfluous info about place
			target.html(target.html().replace(/<span>Austin, TX, United States<\/span>$/, ""));
		}
	}
});