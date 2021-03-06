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
 *
 */
 
function multiSelectJs(el, options) {
	//Initialization variables
	this.initialized = false;
	this.initializing = false;
	
	//State variables
	this.updating = false;
	this.focusing = false;
	this.disabled = true;
	this.silentSearch = false;//Should the dropdown NOT be shown after the search is complete
	
	//State variables
	this.hasRequest = false;//Is there a current server request being fired	
	this.uId = null;
	
	//Behavioral settings
	this.maxSelections = 5;//Number of items the user can select
	this.maxResults = 10;//Maximum number of matches that may appear after a search
	
	//DOM references
	this.template = null;//The object upon which this is based (can be any tag type)
	this.form = null;//The form (if any) in which this multiSelectJs resides
	this.main = null;
	this.selectionArea = null;
	this.placeholder = null;
	this.input = null;
	this.dropdown = null;
	this.scrollParent = null;
	this.selectionReferences = [];//The selected options that appear in the main div
	this.resultReferences = [];//The contents of the dropdown
	this.hoveredReference = null;//The currently highlighted option
	
	//DOM status
	this.mainHeight = null;
	this.mainId = null;
	
	//Stored and selected data
	this.dataSet = [];//The stored values from which the user can search
	this.selections = [];//The current selections
	this.results = [];//The data of the contents of the dropdown
	this.selectionString = "";
	this.hoveredData = null;//The data of the currently highlighted option
	
	//Duplicate text input
	this.duplicateInput = null;
	
	//Messages
	this.noResultsMessage = "No results found";
	this.placeholderText = "Select an option";
	
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
	
	//Events
	this.submitEvent = null;
	
	//Other
	this.forbiddenCharacters = /[^a-zA-Z0-9\s\+\=\-\*\$\%\.\,\!\@\#\&\(\)\;\"\'\?]/g;

	//SalesForce Specific
	this.salesForceRemotingMethod = null;
	
	if(!!el) this.init(el, options);
}

multiSelectJs.Data = function(label, value) {
	this.label = label.trim();
	this.value = value.trim().toUpperCase();
}

/**
 *	Array.isArray polyfill (mozilla)
 */
if(!Array.isArray) {
	Array.isArray = function(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	};
}

multiSelectJs.prototype.init = function(el, options) {
	this.uId = 'fs' + ("0000" + (Math.random() * Math.pow(36,4) << 0).toString(36)).slice(-4);
	
	//Check whether already initialized/initializing
	if(this.initialized) return;
	this.initializing = true;	
	
	//Set state variables
	this.updating = false;
	this.focusing = false;
	
	this.parseOptions(options);
	
	//Check for id string
	if(typeof el == "string") el = document.getElementById(el);
	//Error check
	if(typeof el == "undefined" || !el) throw new TypeError('multiSelectJs requires a valid HTML element to initialize.');
	//Check whether a multiSelectJs already exists for this element
	if(!!el.multiSelectJs) throw new Error("A multiSelectJs already exists for this element");

	this.template = el;

	this.buildGui(el);

	this.updateSelectedData();
	
	var selCount = this.selections.length;
	if(selCount >= this.maxSelections) {
		$(this.main).addClass("full");
		this.hidePlaceholder();
	} else if(selCount === 0) $(this.main).addClass("empty");
	
	this.setEventListeners();
	
	el.multiSelectJs = this;
	this.initialized = true;
	this.initializing = false;
}

multiSelectJs.prototype.parseOptions = function(options) {
	if(!options) options = {};
	
	//Set main div ID
	if(typeof options.id === "string") this.mainId = options.id;
	else this.mainId = null;
	
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
	if(typeof options.data !== "undefined") this.dataSet = multiSelectJs.parseData(data);
	
	//Scroll parent
	t = typeof options.scrollParent;
	if(t !== "undefined") {
		var s = options.scrollParent;
		if(t === "string") s = document.getElementById(s);
		if(!!s) this.scrollParent = s;
	}
	if(!this.scrollParent) this.scrollParent = document.body;
	
	//Enabled state
	t = typeof options.disabled;
	if(t === "boolean") this.disabled = options.disabled;
	else if(t === "string") {
		if(t.trim().toLowerCase() === "false") this.disabled = true;
		else this.disabled = false;
	} else this.disabled = false;
	
	//Placeholders
	if(typeof options.placeholder === "string") this.placeholderText = options.placeholder;
	if(typeof options.noResultsMessage === "string") this.noResultsMessage = options.noResultsMessage;
	
	//Counters
	if(typeof options.maxSelections === "number") this.maxSelections = options.maxSelections;
	if(typeof options.maxResults === "number") this.maxResults = options.maxResults;

	//Other
	if(typeof options.delimiter === "string") this.delimiter = options.delimiter;
	
	//Preselected options
	if(!!options.selections) this.selections = (multiSelectJs.parseData(options.selections) || []);

	//Custom search method
	if(!!options.searchMethod) {
		if(typeof options.searchMethod === "function") this.searchMethod = options.searchMethod;
		else throw new TypeError("An invalid searchMethod function has been provided to multiSelectJs");
	} else this.searchMethod = this.localSearch;
	
	//Submit event
	if(!!options.submitEvent) {
		if(typeof options.submitEvent === "function") this.submitEvent = options.submitEvent;
		else throw new TypeError("An invalid submitEvent function has been provided to multiSelectJs");
	}
	
	//SalesForce specific
	if(!!options.salesForceRemotingMethod) {
		if(typeof options.salesForceRemotingMethod === "function") {
			this.salesForceRemotingMethod = options.salesForceRemotingMethod;
			if(!options.searchMethod) this.searchMethod = multiSelectJs.salesForceSearch;
		} else throw new TypeError("An invalid SalesForce search function has been provided to multiSelectJs");
	}
}

multiSelectJs.prototype.buildGui = function(el) {
	var doc = document;
	
	//Build the main div
	var main = doc.createElement("div");
	if(this.mainId) main.id = this.mainId;
	if(this.disabled) main.className = "multiSelectJs disabled";
	else main.className = "multiSelectJs";

	//main.tabIndex = 0;
	main.innerHTML = "<div class=\"multiSelectJs-loader\"></div>";
	
	//Build selected item area
	var selectionArea = doc.createElement("div");
	selectionArea.className = "selections";
	selectionArea.innerHTML = "<span class=\"selection-placeholder\">&nbsp;</span>";
	main.appendChild(selectionArea);
	
	//Create the input
	var input = doc.createElement("span");
	input.setAttribute("contenteditable", "true");
	input.tabIndex = 0;
	input.className = "multiSelectJs-input empty";
	input.setAttribute("spellcheck", "false");
	main.appendChild(input);
	
	//Create the placeholder
	var placeholder = doc.createElement("span");
	placeholder.className = "multiSelectJs-placeholderText";
	placeholder.innerHTML = this.placeholderText;
	placeholder.setAttribute("spellcheck", "false");
	main.appendChild(placeholder);	
	
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
	
	//Get any surrounding form
	var f = $(el).closest("form");
	if(f.length !== 0) this.form = f[0];
}

multiSelectJs.prototype.setEventListeners = function() {
	if(this.form !== null) $(this.form).on("reset." + this.uId, this.reset.bind(this));
	
	$(this.main).on("click." + this.uId, this.mainClick.bind(this));
	$(this.main).on("dblclick." + this.uId, this.mainDoubleClick.bind(this));
	
	$(this.main).on("keydown." + this.uId, this.inputKeyDown.bind(this));
		
	//Split due to ie - great!
	
	$(this.input).on("keyup." + this.uId, this.inputChanged.bind(this));
	
	$(this.input).on("keydown." + this.uId, this.inputKeyDown.bind(this));
	$(this.input).on("focus." + this.uId, this.focusInput.bind(this));
	$(this.input).on("blur." + this.uId, this.blurInput.bind(this));
	
	$(this.dropdown).on("click." + this.uId, this.dropdownClick.bind(this));
	
	$(window).on("resize." + this.uId + " orientationchange." + this.uId, this.checkDropdownPosition.bind(this));
    $(window).on("beforeunload." + this.uId, this.hideDropdown.bind(this));
	
	$(document.body).on("click." + this.uId, this.hideDropdown.bind(this));
	
	$(this.input).on("copy." + this.uId + " cut." + this.uId, this.copyEvent.bind(this));
	$(this.input).on("paste." + this.uId, this.pasteEvent.bind(this));
}

multiSelectJs.prototype.copyEvent = function(ev) {
	ev.preventDefault();
	if(window.clipboardData) window.clipboardData.setData("Text", this.searchTerms);
	else return false;
}

multiSelectJs.prototype.pasteEvent = function(ev) {
	this.updateInputValue();
}

/**
 *	The multiSelectJs destructor
 */
multiSelectJs.prototype.destroy = function() {
	this.updating = true;
	this.focusing = true;
	//Remove event listeners
	try {
		$(document.body).off("." + this.uId);
		$(window).off("." + this.uId);
		$(this.input).off("." + this.uId);
		$(this.main).off("." + this.uId);
		$(this.dropdown).off("." + this.uId);
		if(this.form !== null) $(this.form).off("." + this.uId);
	} catch(ex) {}
	//Remove stored data
	try {
		this.dataSet = null;
		this.selections = null;
		this.results = null;
		this.searchMethod = null;
		this.resultReferences = null;
	} catch(ex) {}
	//Remove dropdown from DOM
	try {
		this.dropdown.parentNode.removeChild(this.dropdown);
		this.dropdown = null;
	} catch(ex) {}
	//Remove main div from DOM
	try {
		this.input = null;
		this.main.parentNode.removeChild(this.main);
		this.main = null;
	} catch(ex) {}
	//Remove remaining references and reset variables
	this.submitEvent = null;
	this.scrollParent = null;
	this.selectionArea = null;
	this.hoveredReference = null;
	this.placeholder = null;
	this.dropdownVisible = false;
	this.uId = null;
	this.hasRequest = false;
	this.initialized = false;
	this.initializing = false;
	//Clear template DOM data
	try {
		$(this.template).show();
		this.template.multiSelectJs = null;
		this.template = null;
		this.form = null;
	} catch(ex) {}
	this.updating = false;
	this.focusing = false;
}

multiSelectJs.prototype.mainClick = function(ev) {
	ev.stopPropagation();
	ev.preventDefault();
	this.hidePlaceholder();
	this.input.focus();
}

multiSelectJs.prototype.mainDoubleClick = function(ev) {
	this.focusInput(ev, true, true);
}

multiSelectJs.prototype.focusInput = function(ev, noDelay, selectAll) {
	if(!!ev) {
		ev.preventDefault();
		ev.stopPropagation();
	}
	if(!this.initialized || this.focusing || this.disabled) return;
	this.hidePlaceholder();
	this.focusing = true;
	
	if(this.selections.length < this.maxSelections) {
		//Avoid re-entrancy issues
		if(noDelay === true) {
			this.input.focus();
			this.finishInputFocus(ev, selectAll);
		} else {
			window.setTimeout(function() {
				this.finishInputFocus(ev, selectAll);
			}.bind(this), 0);
		}
	}
}

multiSelectJs.prototype.finishInputFocus = function(ev, selectAll) {
	//Another fix for ie
	var firstChild = this.input.firstChild;
	var isEmpty = this.isInputEmpty();
	
	if(!!firstChild) {
		var l = (this.searchTerms === null ? 0 : this.searchTerms.length);
		if(l === 0) firstChild = this.input.lastChild;
		this.showDropdown();
		//Set cursor to end position - if click occurred to the right of the text
		if(!isEmpty && (ev.clientX > $(this.input).offset().left + $(this.input).width() || selectAll === true)) {
			var selection = window.getSelection();
			var range = document.createRange();
			range.setStart(firstChild, (selectAll === true ? 0 : l));
			range.setEnd(firstChild, l);
			selection.addRange(range);
		}
	}
	this.focusing = false;
}

multiSelectJs.prototype.dropdownClick = function(ev) {
	ev.stopPropagation();
}

multiSelectJs.prototype.blurInput = function(ev) {
	if(!this.initialized) return;
	if(this.focusing) {
		ev.preventDefault();
		return;
	}
	var firstChildNull = (this.input.firstChild === null);//ie fix
	var noTerms = (this.searchTerms === "");
	if((noTerms || firstChildNull) && this.selections.length < this.maxSelections) {
		if(noTerms || firstChildNull) this.showPlaceholder();
	}
}

multiSelectJs.prototype.showPlaceholder = function() {
	this.placeholder.style.display = "inline";
}

multiSelectJs.prototype.hidePlaceholder = function() {
	this.placeholder.style.display = "none";
}

multiSelectJs.prototype.inputChanged = function(ev) {
	if(!this.initialized || this.updating || this.disabled || this.selections.length >= this.maxSelections) return;
	var key = ev.keyCode;
	//If ctrl is held, or the key pressed is tab (9), enter (13), ctrl (17), shift(16), escape (27),
	//left (37), up (38), right (39), or down (40)
	if(ev.ctrlKey || key === 9 || key === 13 || key === 16 || key === 17 || key === 27 || key === 37 || key === 38 || key === 39 || key === 40) return;
	if((this.searchString === null || this.searchString === "") && key === 8) return;
	this.updateInputValue();
}

multiSelectJs.prototype.updateInputValue = function() {
	this.updating = true;
	
	var t = this.input;
	
	//Sanitize the contents	
	var originalContent = $(t).text();
	var newValue = originalContent.replace(this.forbiddenCharacters, "");
	var lengthDifference = originalContent.length - newValue.length;

	//Get the current caret position
	var pos = 0, containerEl = null, sel = window.getSelection(), range = null;
	if(sel.rangeCount !== null && sel.rangeCount > 0) range = sel.getRangeAt(0);
	if(range !== null && range.commonAncestorContainer.parentNode == t) pos = range.startOffset - (lengthDifference > 0 ? lengthDifference : 0);
	
	//Set the sanitized contents
	$(t).text(newValue);
	
	var isEmpty = this.isInputEmpty() && newValue.length === 0;//ie fix
	
	if(isEmpty) {
		this.searchTerms = "";
		this.hideDropdown();
		this.updating = false;
		$(this.input).addClass("empty");
		return;
	} else $(this.input).removeClass("empty");
	
	//Set the new caret position
	var l = newValue.length;
	if(!isEmpty) {
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
	
	this.searchTerms = newValue;

	//Make sure a close dialog can be reopened with the same search terms
	if(this.searchTerms === this.lastSearch && !this.hasRequest) this.showDropdown();
	else this.performSearch();
	this.updating = false;
}

//For ie.
multiSelectJs.prototype.isInputEmpty = function() {
	return (this.input.firstChild === null || this.searchTerms === null || this.searchTerms.length === 0);
}

multiSelectJs.prototype.inputKeyDown = function(ev) {
	ev.stopPropagation();
	if(!this.initialized || this.updating || this.disabled) return;
	var key = ev.keyCode;
	//The enter key
	if(key === 13) {
		//Stop <br/> elements from being entered into the input
		ev.preventDefault();
		//Select the currently highlighted option
		if(this.dropdownVisible) {
			if(this.hoveredData !== null) this.selectOption(this.hoveredReference);
			else if(this.results === null || this.results.length === 0) this.hideDropdown();
		} else if(this.submitEvent !== null) this.submitEvent();
		else if(this.form !== null) {
			//Just calling form.submit() will not fire the onclick handler
			//Check if there is already a submit button
			var btns = $(this.form).find("input[type='submit']");
			if(btns.length > 0) btns[0].click();
			else {
				//Otherwise submit a form with a temporary button
				var temp = document.createElement("input");
				temp.setAttribute("type", "submit");
				temp.style.position = "absolute";
				temp.style.visibility = "hidden";
				this.form.appendChild(temp);
				temp.click();
				this.form.removeChild(temp);
				temp = null;
			}
		}
	//Backspace
	} else if(key === 8) {
		if(this.isInputEmpty()) {
			ev.preventDefault();
			this.hideDropdown();
			this.lastSearch = null;
			//If the input is empty, delete the latest selection
			if(this.selections.length !== 0) this.selections.pop();
			this.updateSelectedData();
			$(this.input).focus();
		}
	}
	//Tab
	else if(key === 9) this.hideDropdown();
	//Down arrow
	else if(key === 40) {
		//Stop the page from scrolling
		ev.preventDefault();
		if(this.dropdownVisible) this.incrementHoverIndex(1);
		else if(!this.hasRequest && this.searchTerms !== null && this.searchTerms.length > 0 && this.selections.length < this.maxSelections) this.showDropdown();
	}
	//Up arrow
	else if(key === 38) {
		//Stop the page from scrolling
		ev.preventDefault();
		if(this.dropdownVisible) this.incrementHoverIndex(-1);
		else if(!this.hasRequest && this.searchTerms !== null && this.searchTerms.length > 0 && this.selections.length < this.maxSelections) this.showDropdown();
	}
	//Escape
	else if(key == 27) this.hideDropdown();
	//Cannot select any more
	else if(this.selections.length >= this.maxSelections) ev.preventDefault();
	//Forbidden characters
	else if(this.forbiddenCharacters.test(String.fromCharCode(key))) ev.preventDefault();
	//Multiple trailing spaces
	//else if(this.searchTerms !== null && this.searchTerms !== "" && this.searchTerms[this.searchTerms.length-1] === " " && key === 32) ev.preventDefault();
}

/**
 *	Performs everything necessary to reflect the value of the this.selections array on the page.
 */
multiSelectJs.prototype.updateSelectedData = function() {
	this.updating = true;
	//Check for removed selections
	var guis = this.selectionReferences;
	var values = this.selections;
	var found, x, y = values.length, i = 0, j = guis.length;
	for(; i < j; i++) {
		found = false;
		for(x = 0; x < y; x++) {
			if(multiSelectJs.isDataEqual(guis[i].value, values[x])) {
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
	
	//Add new values to gui and prepare update selection string
	var s, t, valueStrings = [];
	for(x = 0; x < y; x++) {
		valueStrings.push(values[x].value);
		found = false;
		for(i = 0; i < j; i++) {
			if(multiSelectJs.isDataEqual(guis[i].value, values[x])) {
				found = true;
				break;
			}
		}
		if(!found) {
			//Create gui element
			t = document.createElement("span");
			t.value = values[x];
			t.className = "selection";
			t.innerHTML = "<span class=\"selectionText\" spellcheck=\"false\">" + values[x].label + "</span>";
			s = document.createElement("span");
			s.className = "multiSelectJs-close";
			s.onclick = this.removeSelection.bind(this);
			t.appendChild(s);
			this.selectionReferences.push(t);
			this.selectionArea.appendChild(t);
		}
	}
	
	//Update selection string
	this.selectionString = valueStrings.join(this.delimiter);
	
	//Update the linked text field
	if(this.duplicateInput !== null) this.duplicateInput.value = this.selectionString;
	
	//Update dropdown position
	
	if(this.dropdownVisible) {
		var h = $(this.main).height();
		if(h != this.mainHeight) {
			this.mainHeight = h;
			this.prepareToPositionDropdown();
		}
	}
	
	//Show input if more options can be selected
	var selCount = this.selections.length;
	if(selCount < this.maxSelections && $(this.main).hasClass("full")) $(this.main).removeClass("full").focus();
	else if(selCount === 0) $(this.main).addClass("empty");
	if(selCount > 0) $(this.main).removeClass("empty");
	
	this.updating = false;
}

/**
 *	The dropdown option click event - used to add new selections
 */
multiSelectJs.prototype.optionClick = function(ev) {
	if(!this.initialized) return;
	this.selectOption(ev.target);
}

/**
 *	Selects an option from the dropdown box.  Accepts a reference to the select option element.
 */
multiSelectJs.prototype.selectOption = function(optionReference) {
	if(!this.initialized || this.disabled) return;
	if(this.selections.length < this.maxSelections) {
		var value = optionReference.value;
		this.selections.push(value);
		this.updateSelectedData();
		
		//Get target index
		var oldIndex = null;
		for(var i = 0, j = this.resultReferences.length; i < j; i++) {
			if(this.resultReferences[i].value === value) {
				oldIndex = Math.max(0, i - 1);
				break;
			}
		}
		//Handle a non-existant entry (shouldn't happen)
		if(oldIndex === null) throw new Error("Error in multiSelectJs.selectOption(ref).  Supplied reference cannot be found in the dropdown");
		
		//Remove target from gui
		optionReference.parentElement.removeChild(optionReference);
		
		//Remove target from results array
		for(var i = 0, j = this.results.length; i < j; i++) {
			if(multiSelectJs.isDataEqual(this.results[i], value)) {
				this.results.splice(i, 1);
				this.resultReferences.splice(i, 1);
				i--;
				j--;
			}
		}
		//Reset highlight
		if(this.hoveredData != null) {
			if(this.results.length === 0) {
				this.hoveredData = null;
				this.hoveredReference = null;
			} else {
				this.hoveredData = this.results[oldIndex];
				this.hoveredReference = this.resultReferences[oldIndex];
				$(this.hoveredReference).addClass("hovered");
			}
		}
		//Hide dropdown if the maximum number of selections has been reached
		var selCount = this.selections.length;
		if(selCount >= this.maxSelections) $(this.main).addClass("full");
		else if(selCount === 0) $(this.main).addClass("empty");
		if(selCount > 0) $(this.main).removeClass("empty");
		else this.showPlaceholder();
		
		//Empty the search box
		$(this.input).text("").addClass("empty").focus();
		this.searchTerms = "";
		this.lastSearch = null;
		
		//Set no results message
		if(j === 0) this.showNoResultsMessage();
		//Hide the dropdown
		this.hideDropdown();
	}
}

/**
 *	Triggers when the mouse enters or moves within an option in the dropdown box.  Used to highlight
 *	the hovered option
 */
multiSelectJs.prototype.optionEnter = function(ev) {
	if(!this.initialized || this.disabled) return;
	var old = this.hoveredData;
	var t = ev.target;
	var v = t.value;
	this.hoveredData = v;
	if(!multiSelectJs.isDataEqual(this.hoveredData, old)) {
		//Select current option
		$(t).addClass("hovered");
		//Deselect other options
		for(var i = 0, j = this.resultReferences.length; i < j; i++) {
			t = this.resultReferences[i];
			if(multiSelectJs.isDataEqual(t.value, v)) this.hoveredReference = t;
			else $(t).removeClass("hovered");
		}
	}
}

/**
 *	Increments or decrements the selected index by the offset specified
 */
multiSelectJs.prototype.incrementHoverIndex = function(offset) {
	if(!this.initialized) return;
	var results = this.results, resultOptions = this.resultReferences;
	var i, j = results.length;
	//Handle no results
	if(j === 0) {
		this.hoveredData = null;
		this.hoveredReference = null;
		return;
	}
	//Get and increment the current index (if any) - otherwise start at 0
	var index = 0;
	if(this.hoveredData !== null) {
		var data = this.hoveredData;
		for(i = 0; i < j; i++) {
			if(multiSelectJs.isDataEqual(data, results[i])) {
				index = i + offset;
				break;
			}
		}
	}
	//Stop overflow
	if(index < 0 || index >= j) return;
	//Apply the new index
	for(i = 0; i < j; i++) {
		if(i === index) {
			this.hoveredReference = resultOptions[i];
			$(this.hoveredReference).addClass("hovered");
			this.hoveredData = results[i];
			this.scrollOptionIntoView(i);
		} else $(resultOptions[i]).removeClass("hovered");
	}
}

multiSelectJs.prototype.optionExit = function(ev) {
	if(!this.initialized || this.disabled) return;
	this.hoveredData = null;
	this.hoveredReference = null;
	$(ev.target).removeClass("hovered");
}

/**
 *	The selected item click event - used to remove selected options
 */
multiSelectJs.prototype.removeSelection = function(ev) {
	if(!this.initialized || this.disabled) return;
	var v = ev.target.parentElement.value, i = 0, j = this.selections.length;
	for(; i < j; i++) {
		if(multiSelectJs.isDataEqual(v, this.selections[i])) {
			this.selections.splice(i, 1);
			i--;
			j--;
		}
	}
	this.updateSelectedData();
	//Update results for future reference
	if(this.searchTerms != "") {
		this.lastSearch = null;
		this.performSearch(true);
	}
	this.hideDropdown();
	
	//Stop the focus event from propagating through and re-showing the dropdown
	ev.stopPropagation();
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
 *
 *	If set to silent, the dropdown will not be shown afterwards
 */
multiSelectJs.prototype.performSearch = function(silent) {
	//Ensure only one request fires at a time and that the search terms exist and have changed
	if(!this.initialized || typeof this.searchTerms !== "string" || this.searchTerms.trim() === "" || this.searchTerms === this.lastSearch) return;
	if(this.hasRequest) {
		this.silentSearch = silent;
		return;
	}
	try {
		this.hasRequest = true;
		this.lastSearch = this.searchTerms;
		if(this.searchMethod !== this.localSearch) $(this.main).addClass("loading");
		this.searchMethod(this.searchTerms, this.selections, this);
	} catch(ex) {
		$(this.main).removeClass("loading");
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
			if(multiSelectJs.isDataEqual(t, this.selections[x])) {
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
	if(!this.initialized) return;
	if(this.searchTerms === null || this.searchTerms.trim() === "") {
		this.lastSearch = this.searchTerms;
		$(this.main).removeClass("loading");
	} else if(this.searchTerms !== this.lastSearch) {
		this.hasRequest = false;
		this.performSearch();
		return;
	} else {
		//Get data
		var results = multiSelectJs.parseData(data);
		//Remove duplicate values
		var i = 0, j = this.selections.length, x, y = results.length;;
		for(; i < j; i++) {
			for(x = 0; x < y; x++) {
				if(this.selections[i].value === results[x].value) {
					results.splice(x, 1);
					x--;
					y--;
				}
			}
		}
		this.results = results;
		
		//Populate dropdown
		this.populateDropdown();
		$(this.main).removeClass("loading");
		if(!this.silentSearch) this.showDropdown();
	}
	this.hasRequest = false;
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

/**
 *	Scrolls the select option at a given index into view within the dropdown
 */
multiSelectJs.prototype.scrollOptionIntoView = function(index) {
	if(!this.initialized || !this.dropdownVisible || this.results.length === 0) return;
	//Get the selected option
	var dropdown = this.dropdown;
	var selection = this.resultReferences[index];
    //Scroll dropdown to show option
    var optTop = $(selection).position().top;
    var optHt = $(selection).innerHeight();
    var dropTop = $(dropdown).offset().top;
    var dropHt = $(dropdown).innerHeight();
    if(optTop < 0) dropdown.scrollTop += optTop;
    else if(optTop + optHt > dropHt) dropdown.scrollTop += (optTop + optHt - dropHt);
    //Scroll window into view
    if($(selection).offset().top < $(window).scrollTop()) selection.scrollIntoView(true);
    else if($(selection).offset().top + $(selection).innerHeight() > $(window).scrollTop() + window.innerHeight) selection.scrollIntoView(false);
}

multiSelectJs.prototype.hideDropdown = function(immediate) {
	if(!this.dropdownVisible || !this.initialized) return;
	if(immediate === true) $(this.dropdown).stop().hide();
	else $(this.dropdown).stop().fadeOut();
	this.hoveredData = null;
	this.hoveredReference = null;
	//Deselect the options in the gui
	$(this.resultReferences).removeClass("hovered");
	this.dropdownVisible = false;
}

multiSelectJs.prototype.showDropdown = function() {
	if(this.dropdownVisible === true || !this.initialized || this.disabled) return;
	this.prepareToPositionDropdown();
	this.hoveredData = null;
	this.hoveredReference = null;
	this.dropdownVisible = true;
	$(this.dropdown).stop().fadeIn();
}

multiSelectJs.prototype.populateDropdown = function() {
	if(!this.initialized) return;
	var dropdown = this.dropdown;
	var results = this.results;
	var doc = document;
	var t, j = results.length;
	dropdown.innerHTML = "";
	this.resultReferences = [];
	//Yes results
	if(j === 0) this.showNoResultsMessage();
	else for(var i = 0; i < j; i++) {
		t = doc.createElement("div");
		t.className = "multiSelectJs-option";
		$(t).text(results[i].label);
		t.value = results[i];
		t.onmouseover = this.optionEnter.bind(this);
		t.onmouseout = this.optionExit.bind(this);
		t.onclick = this.optionClick.bind(this);
		this.resultReferences.push(t);
		dropdown.appendChild(t);
	}
}

multiSelectJs.prototype.showNoResultsMessage = function() {
	if(!this.initialized) return;
	this.dropdown.innerHTML = "";
	var t = document.createElement("div");
	t.className = "multiSelectJs-noResults";
	$(t).text(this.noResultsMessage);
	t.onclick = this.hideDropdown.bind(this);
	this.dropdown.appendChild(t);
}

/*
 *	Data handling methods
 */
/**
 *	Sets the current selections in the multiSelectJs
 */
multiSelectJs.prototype.setSelections = function(selections) {
	if(this.initialized) {
		this.selections = multiSelectJs.parseData(selections);
		this.updateSelectedData();
	}
}
 
/**
 *	Gets the current selections in the multiSelectJs
 */
multiSelectJs.prototype.getSelections = function() {
	if(this.initialized) return this.selections;
	return null;
}

/**
 *	Gets the current selections in the multiSelectJs
 */
multiSelectJs.prototype.getValue = function() {
	if(this.initialized) return this.selectionString;
	return null;
}

/**
 *	Adds the supplied data to the current selections
 */
multiSelectJs.prototype.addSelections = function(selections) {
	if(this.initialized) {
		var t = multiSelectJs.parseData(selections);
		if(t.length === 0) return;
		this.selections.concat(t);
		this.updateSelectedData();
	}
}
 
/**
 *	Remove the supplied data from the current selections
 */
multiSelectJs.prototype.removeSelections = function(selections) {
	if(this.initialized) {
		var t = multiSelectJs.parseData(selections);
		var i = 0, j = this.selections.length, x, y = t.length;
		if(y === 0 || j === 0) return;
		for(; i < j; i++) {
			for(x = 0; x < y; x++) {
				if(multiSelectJs.isDataEqual(this.selections[i], t[x])) {
					selections.splice(x, 1);
					this.selections.splice(i, 1);
					i--;
					j--;
					x--;
					y--;
					break;
				}
			}
		}
		this.updateSelectedData();
	}
}

/**
 *	Clears the current selections in the multiSelectJs
 */
multiSelectJs.prototype.reset = function() {
	if(!this.initialized) return;
	this.selections = [];
	this.updateSelectedData();
}

multiSelectJs.prototype.blur = function() {
	this.blurInput();
}

multiSelectJs.prototype.focus = function() {
	this.focusInput();
}

multiSelectJs.prototype.enable = function() {
	this.disabled = false;
	$(this.main).removeClass("disabled");
}

multiSelectJs.prototype.disable = function() {
	this.hideDropdown();
	this.disabled = true;
	$(this.main).addClass("disabled");
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

multiSelectJs.isDataEqual = function(a, b) {
	if(a === null || b === null || typeof a.value !== "string" || typeof b.value !== "string") return false;
	return (a.value === b.value);
}

/**
 *	Parses data into the multiSelectJs.  Accepts the following formats:
 *		-	[{value: "", label: ""}, ...]
 *		-	As above - but JSON encoded
 */
multiSelectJs.parseData = function(data) {
	if(data === null) return [];
	var out = [];
	var dataType = typeof data;
	if(dataType === "string") {
		try {
			data = JSON.parse(data);
		} catch(ex) {
			throw new TypeError("Invalid " + dataType + " entered into multiSelectJs.parseData().  If using a string, it must represent a JSON encoded array of objects with 'value' and 'label' parameters as strings.");
		}
	}
	if(data === []) return [];
	if(Array.isArray(data)) {
		for(var i = 0, j = data.length; i < j; i++) {
			var t = data[i];
			if(typeof t.label === "string" && typeof t.value === "string") out.push(t);
			//HANDLE OTHER THINGS
		}
	} else throw new TypeError("Invalid " + dataType + " entered into multiSelectJs.parseData().  If using a string, it must represent a JSON encoded array of objects with 'value' and 'label' parameters as strings.");
	
	//HANDLE DIFFERENT DATA INPUTS
	return out;
}

//Calls a SalesForce remote method 
multiSelectJs.salesForceSearch = function(searchTerms, excludedResults, multiSelectInstance) {
	if (typeof multiSelectInstance.salesForceRemotingMethod != "function") throw new Error("No function provided to multi select");
	multiSelectInstance.salesForceRemotingMethod(searchTerms, excludedResults, function(ret, res) {
		multiSelectInstance.searchCallback(ret);
	});
};