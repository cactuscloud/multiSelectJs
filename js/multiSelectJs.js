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
 *					scrollParent
 *						- The scroll parent for this multiSelectJs.  This is useful for selects placed
 *						on a modal or dialog that doesn't scroll with the body.  This parameter
 *						accepts an element ID or a reference to an element.
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
	this.main = null;
	this.selectionArea = null;
	this.placeholder = null;
	this.input = null;
	this.dropdown = null;
	this.scrollParent = null;
	this.selectionReferences = [];
	
	//DOM status
	this.mainHeight = null;
	
	//Stored and selected data
	this.dataSet = [];//The stored values from which the user can search
	this.selections = [];//The current selections
	this.results = [];//The contents of the dropdown
	
	this.selectedData = null;
	
	//Duplicate text input
	this.duplicateInput = null;
	
	//Messages
	this.noResultsText = "No results found";
	this.placeholderText = "Selectshit";
	
	
	//The search funciton.  This specifies where the multiSelect values come from when the user
	//performs a search.  If left unset, the values will be sourced from the dataSet variable.
	//This function should accept one search string and optionally an instance of "this".  This 
	//function should call multiSelectJs.searchCallback(Array data) upon completion.
	this.searchMethod = this.localSearch;
	this.searchTerms = null;//The current search terms
	this.lastSearch = null;//The previous search terms
	this.delimiter = ';';
	
	//Dropdown positioning
    this.dropdownX = 0;
    this.dropdownY = 0;
    this.dropdownWidth = 0;
	this.dropdownVisible = false;
	
	//Other
	this.forbiddenCharacters = /[^a-zA-Z0-9 \+\=\-\*\$\%\.\,\!\@\#\&\(\)\;\"\'\?]/;

	if(!!el) this.init(el, options);
}

function msData(label, value) {
	this.label = label.trim();
	this.value = value.trim().toUpperCase();
}
multiSelectJs.prototype.isDataEqual = function(a, b) {
	if(!(a instanceof msData) || !(b instanceof msData)) return false;
	return (a.value === b.value);
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
	
	//Set data HERE ------------------------
	
	this.updateSelectedData();
	
	this.setEventListeners();
	
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
	//Scroll parent
	t = typeof options.scrollParent;
	if(t !== "undefined") {
		var s = options.scrollParent;
		if(t === "string") s = document.getElementById(s);
		if(!!s) this.scrollParent = s;
	}
	if(!this.scrollParent) this.scrollParent = document.body;
	
}

multiSelectJs.prototype.buildGui = function(el) {
	var doc = document;
	
	//Build the main div
	var main = doc.createElement("div");
	main.className = "multiSelectJs";
	main.tabIndex = 0;
	var selectionArea = doc.createElement("div");
	selectionArea.className = "selections";
	selectionArea.innerHTML = "<span class=\"selection-placeholder\">&nbsp;</span>";
	
	//Create the placeholder
	var placeholder = doc.createElement("span");
	placeholder.className = "multiSelectJs-placeholder";
	placeholder.innerHTML = this.placeholderText;
	main.appendChild(placeholder);
	
	//Create the input
	var input = doc.createElement("span");
	input.setAttribute("contenteditable", "true");
	input.className = "multiSelectJs-input";
	main.appendChild(selectionArea);
	main.appendChild(input);
	
	
	//Create the dropdown
	var dropdown = doc.createElement("div");
	dropdown.className = "multiSelectJs-dropdown";
	
	//Save the variables
	this.main = main;
	this.selectionArea = selectionArea;
	this.placeholder = placeholder;
	this.input = input;
	this.dropdown = dropdown;
	
	//Add the gui to the page
	el.parentElement.insertBefore(main, el);
	$(el).hide();
	this.scrollParent.appendChild(dropdown);

	//Get main div height
	this.mainHeight = $(main).height();
}

multiSelectJs.prototype.setEventListeners = function() {
	this.main.addEventListener("click", this.focusInput.bind(this));
	
	this.input.addEventListener("input", this.inputChange.bind(this));
	this.input.addEventListener("keydown", this.inputKeyDown.bind(this));
	
	this.input.addEventListener("blur", this.blurInput.bind(this));
	
	$(window).on('resize orientationchange', this.checkDropdownPosition.bind(this));
    $(window).on('beforeunload', this.hideDropdown.bind(this));
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

multiSelectJs.prototype.focusInput = function() {
	if(this.selections.length < this.maxSelections) {
		this.input.style.display = "inline";
		this.input.focus();
	} else this.blurInput();
}

multiSelectJs.prototype.blurInput = function() {
	if(this.input.innerHTML == "" || this.selections.length >= this.maxSelections) this.input.style.display = "none";
}

multiSelectJs.prototype.inputChange = function() {
	var t = this.input;
	
	//Sanitize the contents	
	var newValue = t.innerHTML.replace(this.forbiddenCharacters, "");
	var lengthDifference = t.innerHTML.length - newValue.length;
	
	//Get the current caret position
	var pos = 0, containerEl = null, sel = window.getSelection();
	var range = sel.getRangeAt(0);
	if (range.commonAncestorContainer.parentNode == t) {
		pos = range.startOffset - (lengthDifference > 0 ? lengthDifference : 0);
	}
	
	//Set the sanitized contents
	t.innerHTML = newValue;
	
	//Set the new caret position
	var l = newValue.length;
	if(l > 0) {
		var selection = window.getSelection();
		pos = Math.min(l, pos);
		range = document.createRange();
		range.setStart(t.firstChild, pos);
		range.setEnd(t.firstChild, pos);
		sel.removeAllRanges();
		sel.addRange(range);
	}
	
	//Check the dropdown position in case of main element height change
	if(this.dropdownVisible) {
		var h = $(this.main).height();
		if(h != this.mainHeight) {
			this.mainHeight = h;
			this.prepareToPositionDropdown();
		}
	}
	
	//Prepare search
	this.searchTerms = newValue;
	this.performSearch();
}

multiSelectJs.prototype.inputKeyDown = function(ev) {
	//Stop <br/> elements from being entered into the input
	if(ev.keyCode === 13) ev.preventDefault();
	//else if(ev.keyCode === 8 && this.
}

/**
 *	Performs everything necessary to reflect the value of the this.selections array on the page.
 */
multiSelectJs.prototype.updateSelectedData = function() {
	
	//Check for removed selections
	var guis = this.selectionReferences;
	var values = this.selections;
	var found, x, y = values.length, i = 0, j = guis.length;
	for(; i < j; i++) {
		found = false;
		for(x = 0; x < y; x++) {
			if(this.isDataEqual(guis[i].value, values[x])) {
				found = true;
				break;
			}
		}
		if(!found) {
			//This value no longer exists - remove the element
			var g = guis[i];
			this.selectionArea.removeChild(g);
			guis.splice(i, 1);
			i--;
			j--;
		}
	}
	j = guis.length;
	
	//Add new values to gui
	var s, t;
	for(x = 0; x < y; x++) {
		found = false;
		for(i = 0; i < j; i++) {
			if(this.isDataEqual(guis[i].value, values[x])) {
				found = true;
				break;
			}
		}
		if(!found) {
			//Create gui element
			t = document.createElement("span");
			t.value = values[x];
			t.className = "selection";
			t.innerHTML = "<span class=\"selectionText\">" + values[x].label + "</span>";
			s = document.createElement("span");
			s.className = "multiSelectJs-close";
			s.onclick = this.removeSelection.bind(this);
			t.appendChild(s);
			this.selectionReferences.push(t);
			this.selectionArea.appendChild(t);
		}
	}
	
	//Handle placeholder
	if(this.selections.length === 0) {
		this.placeholder.style.display = "none";
	}
	
	//Update dropdown position
	if(this.dropdownVisible) {
		var h = $(this.main).height();
		if(h != this.mainHeight) {
			this.mainHeight = h;
			this.prepareToPositionDropdown();
		}
	}
}

multiSelectJs.prototype.optionClick = function(ev) {
	if(this.selections.length < this.maxSelections) {
		this.selections.push(ev.target.value);
		this.updateSelectedData();
		ev.target.parentElement.removeChild(ev.target);
		if(this.selections.length >= this.maxSelections) {
			this.hideDropdown();
			this.blurInput();
		}
	}
}

multiSelectJs.prototype.optionEnter = function(ev) {
	var old = this.selectedData;
	var t = ev.target;
	this.selectedData = t.value;
	if(!this.isDataEqual(this.selectedData, old)) $(t).addClass("hovered");
}

multiSelectJs.prototype.optionExit = function(ev) {
	this.selectedData = null;
	$(ev.target).removeClass("hovered");
}

multiSelectJs.prototype.removeSelection = function(ev) {
	var v = ev.target.parentElement.value;
	for(var i = 0, j = this.selections.length; i < j; i++) {
		if(this.isDataEqual(v, this.selections[i])) {
			this.selections.splice(i, 1);
			i--;
			j--;
		}
	}
	this.updateSelectedData();
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
	this.input = null;
	try {
		this.dropdown.parentNode.removeChild(this.dropdown);
		this.dropdown = null;
	} catch(ex) {}
	try {
		this.main.parentNode.removeChild(this.main);
		this.main = null;
	} catch(ex) {}
	this.scrollParent = null;
	this.selectionArea = null;
	this.placeholder = null;
	$(el).show();
	this.dropdownVisible = false;
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
	searchString = searchString.replace(/(&nbsp;)+|\s/gmi, " ");
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
			if(this.isDataEqual(t, this.selections[x])) {
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
		} else data[i].distance = levenshteinDistance(data[i].label, searchString.trim());
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
		
	//Get data
	this.results = this.parseData(data);

	//Populate dropdown
	this.populateDropdown();

	this.showDropdown();
	
	if(hadRequest) this.performSearch();
}

/**
 *	Checks and updates the dropdown position if it is visible.  This is used on window resize and 
 *	orientation change events.
 */
multiSelectJs.prototype.checkDropdownPosition = function() {
	if(this.dropdownVisible) this.prepareToPositionDropdown();
}

/**
*	Calculates the correct position for the dropdown box.  Queues the dropdown box to reposition
*	on the next animation frame.
*/
multiSelectJs.prototype.prepareToPositionDropdown = function() {
	if(!this.initialized) return;
	var main = this.main;
	//If the main select is not visible
    if(main.offsetParent === null) this.hideDropdown();
	else {
		//Get some working variables
		var parentDom = this.scrollParent;
        var offset = $(main).offset();
        var scrollParentOffset = $(parentDom).offset();
		//Store the old dropdown position (no point in updating the position if it hasn't changed)
		var oldTop = this.dropdownTop, oldLeft = this.dropdownLeft, oldWidth = this.dropdownWidth;
        if(parentDom == document.body) {
			//Get the correct dropdown position relative to the document body
            this.dropdownTop = offset.top - scrollParentOffset.top + $(main).outerHeight(false) + parseInt($(parentDom).css('marginTop'));
            this.dropdownLeft = offset.left - scrollParentOffset.left + parseInt($(parentDom).css('marginLeft'));
        } else {
			//Get the correct dropdown position relative to the scroll parent
            this.dropdownTop = offset.top - scrollParentOffset.top + $(parentDom).scrollTop() + $(main).outerHeight();        
            this.dropdownLeft = offset.left - scrollParentOffset.left + $(parentDom).scrollLeft();
        }
        this.dropdownWidth = Math.floor($(main).outerWidth(false));
		//If the dropdown's size or position has changed, queue redraw on the next animation frame
		if(oldTop != this.dropdownTop || oldLeft != this.dropdownLeft || oldWidth != this.dropdownWidth) {
			if(!window.requestAnimationFrame) this.positionDropdown();
			else if(!this.frameRequested) {
				window.requestAnimationFrame(this.positionDropdown.bind(this));
				this.frameRequested = true;
			}
		}
    }
}

/**
*	Immediately sets the dropdown's position and width to the stored dropdown top, left, and width
*	variables in the class.
*/
multiSelectJs.prototype.positionDropdown = function() {
	if(!this.initialized) return;
    $(this.dropdown).css({top: this.dropdownTop, left: this.dropdownLeft, minWidth: this.dropdownWidth});
    $(this.dropdown).outerWidth(this.dropdownWidth);
    this.frameRequested = false;
}

multiSelectJs.prototype.hideDropdown = function(immediate) {
	if(!this.dropdownVisible) return;
	if(immediate === true) {
		
		$(this.dropdown).hide();
	} else {
		
		$(this.dropdown).fadeOut();
	}
	this.dropdownVisible = false;
}

multiSelectJs.prototype.showDropdown = function() {
	if(this.dropdownVisible === true) return;
	this.prepareToPositionDropdown();
	
	this.dropdownVisible = true;
	$(this.dropdown).fadeIn();
	
}

multiSelectJs.prototype.populateDropdown = function() {
	var dropdown = this.dropdown;
	var results = this.results;
	var doc = document;
	var t;
	dropdown.innerHTML = "";
	for(var i = 0, j = results.length; i < j; i++) {
		t = doc.createElement("div");
		t.className = "multiSelectJs-option";
		t.innerHTML = results[i].label;
		t.value = results[i];
		t.onmouseover = this.optionEnter.bind(this);
		t.onmouseout = this.optionExit.bind(this);
		t.onclick = this.optionClick.bind(this);
		dropdown.appendChild(t);
	}
}

/*
 *	Static functions
 */
 multiSelectJs.isVisible = function(ele) {
        var w = $(ele).outerWidth();
        var h = $(ele).outerHeight();
        return  w !== 0 &&
                h !== 0 &&
                ele.style.opacity !== 0 &&
                ele.style.visibility !== 'hidden';
}

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
