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
 */


function multiSelectJs(el, options) {
	//Initialization variables
	this.initialized = false;
	this.initializing = false;
	
	//Behavioral settings
	this.maxSelections = 5;//Number of items the user can select
	this.maxResults = 10;//Maximum number of matches that may appear after a search
	
	//DOM references
	this.template = null;//The object upon which this is based (can be any tag type)
	
	//Stored and selected data
	this.dataSet = [];//The stored values from which the user can search
	this.selections = [];//The current selections
	
	//The search method.  This specifies where the multiSelect values come from when the user
	//performs a search.  If left unset, the values will be sourced from the dataSet variable.
	this.searchMethod = this.localSearch;
	
	
	this.init(el);
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


multiSelectJs.prototype.destroy = function() {
	try {
		this.template.multiSelectJs = null;
		this.template = null;
	} catch(Exception e) {}
	try {
		this.dataSet = null;
		this.searchMethod = null;
	} catch(Exception e) {}
	this.initialized = false;
	this.initializing = false;
}

multiSelectJs.prototype.localSearch = function() {
	
}
	
multiSelectJs.prototype.searchCallback = function(data) {
	
}

