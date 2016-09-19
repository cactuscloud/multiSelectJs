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
 *
 *	Options:
 *					duplicateInput
 *						- A text or hidden input field to store the selected values in.  This is useful for
 *						integration with other frameworks, such as SalesForce.  This can be either a
 *						text ID or a reference to an actual text or hidden element.
 *					data
 *						- Any preloaded data to insert into the multiSelectJs
 *
 *	Attributes (on the initial element):
 *					data-value
 *						- The multiSelectJs' initial value  NOT IMPLEMENTED
 *
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
	
	//Duplicate text input
	this.duplicateInput = null;
	
	//The search funciton.  This specifies where the multiSelect values come from when the user
	//performs a search.  If left unset, the values will be sourced from the dataSet variable.
	//This function should accept one search string and optionally an instance of "this".  This 
	//function should call multiSelectJs.searchCallback(Array data) upon completion.
	this.searchMethod = this.localSearch;
	this.searchTerms = null;//The current search terms
	this.lastSearch = null;//The previous search terms
	this.delimiter = ';';
		
	this.init(el, options);
}

function msData(label, value) {
	this.label = label.trim();
	this.value = value.trim().toUpperCase();
}
msData.prototype.equals = function(other) {
	if(!(other instanceof msData)) return false;
	return (this.value === other.value);
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
	
	this.parseOptions(options);
	
	//Check for id string
	if(typeof el == "string") el = document.getElementById(el);
	//Error check
	if(typeof el == "undefined" || !el) throw new TypeError('multiSelectJs requires a valid HTML element to initialize.');
	//Check whether a multiSelectJs already exists for this element
	if(el.multiSelectJs != null) throw new Error("A multiSelectJs already exists for this element");
	
	this.template = el;
	
	this.buildGui(el);
	
	el.multiSelectJs = this;
	this.initialized = true;
	this.initializing = false;
	
	
		
}

multiSelectJs.prototype.parseOptions = function(options) {
	if(!options) return;
	//Duplicate text input
	var t = typeof options.duplicateInput;
	if(t !== "undefined") {
		var s = options.duplicateInput;
		if(t === "string") s = document.getElementById(s);
		if(!!s && !!s.hasAttribute) {
			if(s.tagName !== "INPUT" || !s.hasAttribute("type")) throw new TypeError('An invalid duplicateInput has been supplied to multiSelectJs.  This be an INPUT with a type of text or hidden.'); 
			var t = s.getAttribute("type");
			if(t != "text" && t != "hidden") throw new TypeError('An invalid duplicateInput has been supplied to multiSelectJs.  This must have a type of text or hidden.');
			this.duplicateInput = s;
		} else throw new TypeError('An invalid duplicateInput has been supplied to multiSelectJs.');
	}
	
	//Data
	if(typeof options.data !== "undefined") this.dataSet = this.parseData(data);

}

multiSelectJs.prototype.buildGui = function(el) {
	
	
}

multiSelectJs.prototype.parseData = function(data) {
	var out = [];
	if(Array.isArray(data)) {
		for(var i = 0, j = data.length; i < j; i++) {
			var t = data[i];
			if(t instanceof msData) out.push(t);
			
			//HANDLE OTHER THINGS
		}
		
	}
	
	//HANDLE DIFFERENT DATA INPUTS
	return out;
}




/**
 *	The multiSelectJs destructor
 */
multiSelectJs.prototype.destroy = function() {
	try {
		this.template.multiSelectJs = null;
		this.template = null;
	} catch(ex) {}
	try {
		this.dataSet = null;
		this.selections = null;
		this.results = null;
		this.searchMethod = null;
	} catch(ex) {}
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
	if(this.hasRequest === true || typeof this.searchTerms !== "string" || this.searchTerms.trim() === "" || this.searchTerms == this.lastSearch) return;
	this.hasRequest = true;
	try {
		this.lastSearch = this.searchTerms;
		this.searchMethod(this.searchTerms, this);
	} catch(ex) {
		this.hasRequest = false;
	}
}

/**
 *	The default search method.  This finds the closest matching values that exist within the this.dataSet
 *	variable and passes them to this.searchCallback.  The search terms passed will not be empty.
 */
multiSelectJs.prototype.localSearch = function(terms) {
	var res;	
	//Do search here
	if(!Array.isArray(this.dataSet)) res = null;
	else {
		var l = this.dataSet.length;
		if(l === 0) res = [];
		else res = this.findClosestMatches(this.dataSet, terms);
	}
	this.searchCallback(res);
}

multiSelectJs.prototype.findClosestMatches = function(dataSet, searchString) {
	//Begin levenshteinDistance function
	function levenshteinDistance(a, b) {
		if(a.length === 0) return b.length; 
		if(b.length === 0) return a.length; 
		var matrix = [];
		// increment along the first column of each row
		var i;
		for(i = 0; i <= b.length; i++) {
			matrix[i] = [i];
		}
		// increment each column in the first row
		var j;
		for(j = 0; j <= a.length; j++){
			matrix[0][j] = j;
		}
		// Fill in the rest of the matrix
		for(i = 1; i <= b.length; i++){
			for(j = 1; j <= a.length; j++){
				if(b.charAt(i-1) == a.charAt(j-1)){
					matrix[i][j] = matrix[i-1][j-1];
				} else {
					matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
											Math.min(matrix[i][j-1] + 1, // insertion
													 matrix[i-1][j] + 1)); // deletion
				}
			}
		}
		return matrix[b.length][a.length];  
	}
	//End levenshteinDistance function
	var data = dataSet.slice(0);
	
	//Create a shortlist of matching options
	var terms = searchString.split(' ');
	var i = 0, j = terms.length;
	var shortlistTestString = "";//Create a regular expression to eliminate non-matching options
	for(; i < j; i++) {
		var s = terms[i].trim();
		if(terms[i].trim() === "") {
			terms.splice(i, 1);
			i--;
			j--;
		} else {
			terms[i] = s;
			shortlistTestString += "(?=.*" + s + ")";
		}
	}
	var shortlistTest = new RegExp("^" + shortlistTestString + ".*$", 'igm');
	shortlistTestString = null;
	terms = null;
	
	//Remove currently selected values and non-matching values the data set
	
	for(var x = 0, y = this.selections.length, j = data.length; x < y; x++) {
		for(i = 0; i < j; i++) {
			var t = data[i];
			if(t.equals(this.selections[x])) {
				data.splice(i, 1);
				i--;
				j--;
			}
		}
	}
	
	//Remove non-matching data and calculate the data's matching score
	for(i = 0; i < j; i++) {
		var t = data[i];
		if(!t.label.match(shortlistTest)) {
			data.splice(i, 1);
			i--;
			j--;
		} else data[i].distance = levenshteinDistance(data[i].label, searchString);
	}
	
	//Now sort the matching data by levenshtein distance
	data.sort(function(a, b) {
		return a.distance - b.distance;
	});
	
	if(j > this.maxResults) return data.slice(0, this.maxResults);
	else return data;	
}



/**
 *	The callback function that should be fired after a user has performed a search.  This method will
 *	trigger another search if another search has been queued.  This method will also validate the
 *	supplied data and trigger the appropriate GUI events as required.
 */
multiSelectJs.prototype.searchCallback = function(data) {
	var hadRequest = this.hasRequest;
	this.hasRequest = false;
	
	//Do call back action here
	if(data == null) {
		//There has been an error
		/* HANDLE THIS */
		
	} else if(typeof data == "string") {
		//There has been an error and an error message has been supplied
		throw new Error("There has been an error fetching multiSelectJs data: " + data);
	} else if(!Array.isArray(data)) {
		//An unknown error has occurred
		console.log("Invalid data supplied:");
		console.log(data);
		throw new TypeError("multiSelectJs has received an invalid data type in its search callback function");
	} else {
		//Data looking okay, so far...
		this.results = null;
		this.results = multiSelectJs.parseData(data, this.maxSelections);
		
		/* Handle an empty set */
		
		/* NOW DO THE GUI */
	}
	
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
