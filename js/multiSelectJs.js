/**
 *	Script:			multiSelectJs
 *	Author:			Cactus Cloud
 *	Year:			2016
 *
 *	Purpose:		To provide a JS multiSelect box compatible with native HTML5 environments and with
 *					enterprise environments such as SalesForce.
 *
 *					This multiSelect box must be able to incorporate stored values or server side provided
 *					values through a server request/callback pattern.
 *
 *	Data format:	multiSelectJs stores its data as an array of objects as follows
 *						[{n: "label", v: "value"}, ...]
 *				
 *	Initialization:	This can be initialized from multiple elements and THIS IS NOT DONE YET!
 *
 *	Polyfills:		The following polyfills are included with this file:
 *						- Array.isArray(x) : Boolean
 */


function multiSelectJs(el, options) {
	//Initialization variables
	this.initialized = false;
	this.initializing = false;
	this.hasRequest = false;//Is there a current server request being fired
	
	//Behavioral settings
	this.maxSelections = 5;//Number of items the user can select
	this.maxResults = 10;//Maximum number of matches that may appear after a search
	
	//DOM references
	this.template = null;//The object upon which this is based (can be any tag type)
	
	//Stored and selected data
	this.dataSet = [];//The stored values from which the user can search
	this.selections = [];//The current selections
	this.results = [];
	
	//The search funciton.  This specifies where the multiSelect values come from when the user
	//performs a search.  If left unset, the values will be sourced from the dataSet variable.
	//This function should accept one search string and optionally an instance of "this".  This 
	//function should call multiSelectJs.searchCallback(Array data) upon completion.
	this.searchMethod = this.localSearch;
	this.searchTerms = null;//The current search terms
	this.lastSearch = null;//The previous search terms
	
	this.init(el);
}

/**
*	Array.isArray polyfill (mozilla)
*/
if (!Array.isArray) {
	Array.isArray = function(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	};
}

multiSelectJs.prototype.init = function(el, options) {
	//Check whether already initialized/initializing
	if(this.initialized) return;
	this.initializing = true;	
	
	//Error check
	if(typeof el == "undefined" || !el) throw new TypeError('multiSelectJs requires a valid HTML element to initialize.');
	//Check for id string
	if(typeof el == "string") el = document.getElementById(el);
	//Check whether a multiSelectJs already exists for this element
	if(el.multiSelectJs != null) throw new Error("A multiSelectJs already exists for this element");
	
	this.template = el;
	
	
	this.parseOptions(options);
	
	
	this.initialized = true;
	this.initializing = false;
}

multiSelectJs.prototype.parseOptions = function(options) {
	if(!options) return;
	
}

/**
 *	The multiSelectJs destructor
 */
multiSelectJs.prototype.destroy = function() {
	try {
		this.template.multiSelectJs = null;
		this.template = null;
	} catch(Exception e) {}
	try {
		this.dataSet = null;
		this.selections = null;
		this.results = null;
		this.searchMethod = null;
	} catch(Exception e) {}
	this.initialized = false;
	this.initializing = false;
}




/**
 *	Initiates a search for the user entered string.  This function ensures that only one search request
 *	is fired at any one time and that search requests only proceed when search terms exist, and have
 *	changed since the last search.
 *
 *	This function will fire the search function stored in multiSelectJs.searchMethod(String terms).  This
 *	function will either be the default search function (multiSelectJs.localSearch(String terms)) or
 *	a custom, user specified search function.
 *
 *	The function defined in this.searchMethod should then fire multiSelectJs.searchCallback(Array data)
 *	upon completion.
 */
multiSelectJs.prototype.performSearch = function() {
	//Ensure only one request fires at a time and that the search terms exist and have changed
	if(this.hasRequest === true || this.searchTerms == null || this.searchTerms == this.lastSearch) return;
	this.hasRequest = true;
	try {
		this.lastSearch = this.searchTerms;
		this.searchMethod(this.searchTerms, this);
	} catch(Exception e) {
		this.hasRequest = false;
	}
}

/**
 *	The default search method.  This finds the closest matching values that exist within the this.dataSet
 *	variable and passes them to this.searchCallback.
 */
multiSelectJs.prototype.localSearch = function(terms) {
	//Do search here
	
	
	this.searchCallback(null);
}
	
/**
 *	The callback function that should be fired after a user has performed a search.  This method will
 *	trigger another search if another search has been queued.  This method will also validate the
 *	supplied data and trigger the appropriate GUI events as required.
 */
multiSelectJs.prototype.searchCallback = function(data) {
	var hadRequest = this.hasRequest;
	
	//Do call back action here
	if(data == null) {
		//There has been an error
		/* HANDLE THIS */
		
	} else if(typeof data == "string") {
		//There has been an error and an error message has been supplied
		this.hasRequest = false;
		throw new Error("There has been an error fetching multiSelectJs data: " + data);
	} else if(!Array.isArray(data)) {
		//An unknown error has occurred
		console.log("Invalid data supplied:");
		console.log(data);
		this.hasRequest = false;
		throw new TypeError("multiSelectJs has received an invalid data type in its search callback function");
	} else {
		//Data looking okay, so far...
		this.results = null;
		this.results = multiSelectJs.parseData(data, this.maxSelections);
		
		/* NOW DO THE GUI */
	}
	
	this.hasRequest = false;
	if(hadRequest) this.performSearch();
}



/*
 *	Static functions
 */
 
/**
 *	"Static" function that checks and limits the size of an array of data values for a multiSelectJs
 *	instance.
 */
multiSelectJs.parseData = function(data, limit) {
	if(!Array.isArray(data)) throw new TypeError("multiSelectJs has received an invalid data type in its search callback function");
	var x, out = [];
	var i = 0, j = data.length;
	if(typeof limit == "number" && limit < j) j = limit;
	for(; i < j; i++) {
		x = data[i];
		if(!typeof x.v == "string" || !typeof x.n == "string") {
			console.log("Invalid data supplied:");
			console.log(x);
			throw new TypeError("multiSelectJs has received invalid result data at index " + i);
		}
		out.push(x);
	}
	return out;	
}
