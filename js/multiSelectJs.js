/**
*	To do:
*		- this.DELIMITER
*			- Throw a warning/error if a value contains the delimiter
*			- init()
*			- getValue()?
*					- Add getValueAsString using the custom delimiter
*		- init()
*			- Handle 'value'-less options
*		- Setting values (init and setValue):
*			- If every value is selected except the "all" value - this should be handled
*/

/** 
*	fancySelectJs constructor.  Builds a new fancySelectJs instance from a given SELECT element.  A
*	scroll parent element may be optionally supplied.  A scroll parent should only be supplied when
*	the dropdown is placed on a modal or other "position: fixed" element.  Without this, the dropdown
*	will be positioned relative to the document body and not the floating parent element.
*
*	Useful select attributes to set on the parent element:
*		-	class					This class will be applied to the new select box
*		-	data-placeholder		The placeholder
*		-	multiple				Should this be a multiple
*		-	data-value				The starting value of the select
*		-	data-scroll-parent		The JS compatible element ID of the scrollparent
*		-	disabled				This will pass through
*		-	data-all-index			The index of the all component (this takes precedence over data-all) - credit goes to salesforce for fucking interfering with their html attributes again.  fuck!	
*		-	data-id					The ID attribute for the new fancySelectJs
*		-	data-prefix				Any prefix text to appear in the select box - e.g. Sort By: YOUR_SELECTION
*
*	Useful option attributes:
*		-	data-all				Sets this to an "All" option which silently selects everything
*		
*/
function fancySelectJs(el) {
	
	//Constants
	this.DELIMITER = ",";
	
	//DOM elements
	//The new select box which will be visible
	this.select = null;
	//The text which may reside within the select box
	this.selectText = null;
	//The dropdown box which will popup
	this.dropdown = null;
	//The object from which this element is based
	this.template = null;
	//The scroll parent (for correct drop down positioning)
	this.parent = null;
	
	//Mode
	this.multiple = false;//Is this a multi-select
	this.disabled = false;//Is this disabled
	this.length = 0;//Number of options
	
	//Session
	this.options = [];//All available option's values and labels
	this.values = [];//The value and labels of any selected options
	this.selectedIndices = [];//The indices of any selected options
	
	//State
	this.frameRequested = false;//Has an animation frame already been requested
	this.dropdownTop;//The y coordinate of the dropdown box
	this.dropdownLeft;//The x coordinate of the dropdown box
	this.dropdownWidth;//The width of the dropdown box
	this.dropdownVisible = false;//Is the dropdown currently visible?
	this.mouseY;//The last recorded y coordinate of the mouse over a select option
	this.mouseX;//The last recorded x coordinate of the mouse over a select option
	this.searchString = "";//Any characters recently typed in
	this.searchTimer;//Clears the searchString after a given amount of time
	this.initializing = false;
	this.initialized = false;
	//MAY NOT BE NEEDED
	this.hoverIndex = 0;//The index of the currently hovered element
	
	//Styling
	this.placeholder = "";
	this.multiplePlaceholder = "Multiple Values";
	this.allPlaceholder = "All";
	this.prefixText = null;
	
	//Special functionality
	this.allIndex = null;
	this.allIndexSelected = false;
		
	//Initialize
	if(typeof el != "undefined" && !!el) this.init(el);
	
	
	//Events
	this.onchange = null;
}

/* Misc. */
/**
*	Array.includes polyfill (Mozilla)
*/
if (!Array.prototype.includes) {
	Array.prototype.includes = function(searchElement) {
		if(this == null) {
			throw new TypeError('Array.prototype.includes called on null or undefined');
		}
		var O = Object(this);
		var len = parseInt(O.length, 10) || 0;
		if(len === 0) return false;
		var n = parseInt(arguments[1], 10) || 0;
		var k;
		if(n >= 0) k = n;
		else {
			k = len + n;
			if(k < 0) k = 0;
		}
		var currentElement;
		while(k < len) {
			currentElement = O[k];
			if (searchElement === currentElement || (searchElement !== searchElement && currentElement !== currentElement)) return true;
			k++;
		}
		return false;
	};
}

/* Polyfills */

/**
*	Array.indexOf polyfill (Mozilla)
*/
// Production steps of ECMA-262, Edition 5, 15.4.4.14
// Reference: http://es5.github.io/#x15.4.4.14
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(searchElement, fromIndex) {
		var k;
		if(this == null) throw new TypeError('"this" is null or not defined');
		var o = Object(this);
		var len = o.length >>> 0;
		if (len === 0) return -1;
		var n = +fromIndex || 0;
		if (Math.abs(n) === Infinity) n = 0;
		if (n >= len) return -1;
		k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);
		while (k < len) {
			if (k in o && o[k] === searchElement) return k;
			k++;
		}
		return -1;
	};
}

/**
*	Array.isArray polyfill (mozilla)
*/
if (!Array.isArray) {
	Array.isArray = function(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	};
}

/* Begin fancySelectJs functions */

//El can be an ID or an element 
//			- this needs testing
fancySelectJs.prototype.init = function(el) {
	if(el.fancySelectJs != null) return;
	if(this.initialized) return;
	this.initializing = true;
	
	//Error check
	if(typeof el == "undefined" || !el) throw new TypeError('fancySelectJs requires a valid HTML SELECT element to initialize.');
	//Check for id string
	if(typeof el == "string") el = document.getElementById(el);
	//Check for validity and tag
	if(typeof el.tagName == "undefined" || !el.tagName) throw new TypeError('fancySelectJs requires a valid HTML SELECT element to initialize.');
	
	this.template = el;
	
	//Get placeholder values from the template element
	this.placeholder = el.getAttribute("data-placeholder") || "";
	this.prefixText = el.getAttribute("data-prefix") || null;
	this.multiple = el.multiple;
	el.oldSize = el.size;
	el.size = 1;//Normalize the height of the initial select
	
	//Get value
	var selections = [];
	if(el.hasAttribute("data-value")) selections = fancySelectJs.parseData(el.getAttribute("data-value"));
	else selections = fancySelectJs.parseData($(el).val());
	
	//Fix for older JQuery versions
	if(selections == null) selections = [];
	
	//Get contents and selections
	var options = el.children, o, v, n;
	for(var i = 0, j = options.length; i < j; i++) {
		o = options[i];
		if(this.multiple && o.hasAttribute("data-all")) this.allIndex = i;
		v = o.getAttribute("value").trim();
		n = {value : v, label : options[i].innerHTML.trim()};
		this.options.push(n);
		if(selections.includes(v)) {
			this.values.push(n);
			this.selectedIndices.push(i);
			if(this.allIndex == i) this.allIndexSelected = true;
		}
	}
	
	//Get the all index as specified on the template select (has to be done due to another SF incompatabilty... bastards...)
	if(el.hasAttribute("data-all-index")) this.allIndex = parseInt(el.getAttribute("data-all-index"));
	
	//Handle scroll parent
	var doc = document;
	if(el.hasAttribute("data-scroll-parent")) {
        var sp = doc.getElementById(el.getAttribute("data-scroll-parent"));
        if(typeof(sp) !== "undefined" && sp != null) this.parent = sp;
		else this.parent = doc.body;
    } else this.parent = doc.body;
	
	this.buildGui(el);
	
	this.setEventListeners();
	
	this.updateValues();
	
	//Set hover index to the selected value when only one value is selected
	if(this.values.length == 1) this.hoverIndex = this.selectedIndices[0];
	
	if(el.disabled) this.disable();
	
	//Hide the old box and replace it with the new one
	$(el).hide();
    el.parentElement.insertBefore(this.select, el);
	
	//Add the dropdown to the page
	this.parent.appendChild(this.dropdown);
	
	//Store this instance on the original select
	el.fancySelectJs = this;
	
	this.initializing = false;
	this.initialized = true;
}

/* Construction functions */

/**
*	Builds the GUI elements of the fancySelectJs.
*/
fancySelectJs.prototype.buildGui = function(el) {
	if(this.initialized) return;
	var doc = document;
	
	//Create the dropdown bounding box
	var selectBox = doc.createElement("div");
	selectBox.className = "fancySelectJs "+el.className;
    selectBox.display = $(el).css("display");
    selectBox.style.display = $(el).css("display");
    selectBox.style.opacity = $(el).css("opacity");
    selectBox.setAttribute("role","listbox");
	if(el.hasAttribute("data-id")) selectBox.id = el.getAttribute("data-id");

	//Create the inner portion of the dropdown
	var inner = doc.createElement("div");
	inner.className = "select";
	inner.tabIndex = 0;
	inner.style.lineHeight = $(el).outerHeight()+"px";
	inner.style.height = $(el).css("height");
	//inner.style.width = el.style.width || $(el).css("width");
	selectBox.appendChild(inner);
	
	//Create the dropdown
	var dropdown = doc.createElement("div");
	dropdown.className = "fancySelectJs_dropdown";
	if(this.multiple) dropdown.setAttribute("data-multiple", "true");
	
	//Fill the dropdown
	var options = el.children, dropdownInner = "";
	for(var i = 0, j = options.length; i < j; i++) {
		if(this.multiple) dropdownInner += "<div role=\"option\" class=\"option check\" aria-checked=\"false\">" + options[i].innerHTML + "</div>";
		else dropdownInner += "<div role=\"option\" class=\"option\" aria-selected=\"false\">" + options[i].innerHTML + "</div>";
	}
	
	dropdown.innerHTML = dropdownInner;
	
	this.selectText = inner;
	this.select = selectBox;
	this.dropdown = dropdown;
}

/**
*	Assignes the event listeners required for the fancySelectJs to operate.
*/
fancySelectJs.prototype.setEventListeners = function() {
	if(this.initialized) return;
	//Window events
	$(window).on("resize orientationchange", this.queuePositionDropdown.bind(this));
	
	//Form events
	$(this.template).closest("form").on("reset", this.reset.bind(this));
	
	//Select events
	$(this.select).on("click", this.selectClick.bind(this));
	
	//Select content events
	$(this.selectText).on("blur",this.blur.bind(this));
	$(this.selectText).on("keydown",this.keydown.bind(this));
	
	//Dropdown events
	$(this.dropdown).on("mousedown", this.dropdownMousedown.bind(this));
	
	//Option events
	$(this.dropdown.children).on("click", this.optionClick.bind(this));
	$(this.dropdown.children).on("mousemove", this.optionHover.bind(this));
	
	//Set value update on document ready - to fix occasional unset values bug
	$(document).one("ready", {fireChangeEvent : false}, this.updateValues.bind(this));
}

/* Destruction functions */
/**
*	Destroys a fancySelectJs instance and its associated HTML elements.  This will free up the data associated
*	with this instance to be ready for garbage collection.  This should be run before deleting a 
*	fancySelectJs instance through code.
*/
fancySelectJs.prototype.destroy = function() {
	try {
		this.template.fancySelectJs = null;
	} catch(ex) {}
	try {
		this.initialized = false;
		this.initializing = false;
		this.allIndexSelected = false;
		clearTimeout(this.searchTimer);
		this.dropdown.innerHTML = "";
		this.select.innerHTML = "";
		this.dropdown.parentNode.removeChild(this.dropdown);
		this.select.parentNode.removeChild(this.select);
	} catch(ex) {}
	try {
		this.template.size = this.template.oldSize;
		$(this.template).show();
	} catch(ex) {}
	try {
		this.onchange = null;
		this.select = null;
		this.selectText = null;
		this.dropdown = null;
		this.template = null;
		this.parent = null;
		this.options = null;
		this.values = null;
		this.selectedIndices = null;
	} catch(ex) {}
}

/* Display update functions */
/**
*	Updates the element to match the values stored in this.values and this.selectedIndices. This
*	function should be run upon initialization and after every update.
*/
fancySelectJs.prototype.updateValues = function(ev) {
	if(!this.initializing && !this.initialized) return;
	//Handle the "all" option of doom
	//	- 	If the "all option is selected", or
	//	-	if the all option exists and nothing is selected, or
	if(this.allIndexSelected || (this.allIndex != null && this.values.length == 0)) {
		this.values = [];
		this.selectedIndices = [];
		this.values.push(this.options[this.allIndex]);
		this.selectedIndices.push(this.allIndex);
		this.allIndexSelected = true;
	}
	//Update the dropdown
	var options = this.dropdown.children, o;
	for(var i = 0, j = options.length; i < j; i++) {
		o = options[i];
		o.removeAttribute("data-hover");
		if(this.selectedIndices.includes(i)) {
			o.setAttribute("data-selected", "true");
			if(this.multiple) o.setAttribute("aria-checked", "true");
			else o.setAttribute("aria-selected", "true");
		} else {
			o.removeAttribute("data-selected");
			if(this.multiple) o.setAttribute("aria-checked", "false");
			else o.setAttribute("aria-selected", "false");
		}
	}
	//Update the select box
	var selectionCount = this.selectedIndices.length;
	if(selectionCount == 0) {
		this.selectText.innerHTML = this.placeholder;
		this.selectText.setAttribute("data-placeholder", "true");
	} else {
		var prefix = (!!this.prefixText ? "<span class=\"prefix\">" + this.prefixText + "</span>&nbsp;" : "");
		this.selectText.removeAttribute("data-placeholder");
		if(selectionCount == 1) this.selectText.innerHTML = prefix + this.values[0].label;
		else if(selectionCount == options.length) this.selectText.innerHTML = prefix + this.allPlaceholder;
		else this.selectText.innerHTML = this.multiplePlaceholder;
	}
	//Update the actual value to match that required by the "all" option most foul
	if(this.allIndexSelected) {
		this.values = [];
		this.selectedIndices = [];
		for(var i = 0, j = this.options.length; i < j; i++) {
			if(i != this.allIndex) {
				this.values.push(this.options[i]);
				this.selectedIndices.push(i);
			}
		}
	}
	
	//Update the template select
	var t = [];
	for(var i = 0, j = this.values.length; i < j; i++) {
		t.push(this.values[i].value);
	}
	$(this.template).val(t);
	if(this.initialized === true && (typeof ev == "undefined" || !ev.data || ev.data.fireChangeEvent !== false)) {
		this.fireEvent("change");
		if(typeof this.onchange == "function") this.onchange();
	}
}

/**
*	Fires an event on the template select using vanilla JS (for SF compatibility).  The 
*	parameter should be the event name without any "on" prefix.  For example, for an onchange event,
*	we would call this.fireEvent("change");
*/
fancySelectJs.prototype.fireEvent = function(eventName) {
	var e = document.createEvent("HTMLEvents");
	e.initEvent(eventName, true, true);
	this.template.dispatchEvent(e);
}

/**
*	Selects an option at a given index.
*	If this is a single select dropdown:
*		-	All indices will be deselected
*		-	The specified index will be selected
*	If this is a multi select dropdown:
*		-	The selected index will be toggled:
*			-	If it is already selected, it will be deselected
*			-	If it is not selected already, it will be selected
*		-	No other indices will be affected
*/
fancySelectJs.prototype.selectIndex = function(index) {
	if(!this.initialized) return;
	if(this.multiple) {
		//Handle the dreaded "all" option
		if(this.allIndexSelected && this.allIndex == index) return;
		if(this.allIndexSelected) {
			this.values = [];
			this.selectedIndices = [];
		}
		this.allIndexSelected = (this.allIndex == index);
		//Handle all the normal stuff
		var i = this.selectedIndices.indexOf(index);
		if(i == -1) {
			this.values.push(this.options[index]);
			this.selectedIndices.push(index);
		} else {
			this.selectedIndices.splice(i, 1);
			this.values.splice(i, 1)
		}
	} else {
		this.values = [];
		this.selectedIndices = [];
		this.values.push(this.options[index]);
		this.selectedIndices.push(index);		
	}
	this.hoverIndex = index;
	this.updateValues();
}

/* Event functions */
/**
*	Triggers the selection of a given option in a single select dropdown context.  Toggles the
*	selection of a given index in a multiselect context.
*/
fancySelectJs.prototype.optionClick = function(ev) {
	if(!this.initialized) return;
	this.selectIndex($(ev.target).index());
	if(!this.multiple) this.hideDropdown();
}

/**
*	Handles selecting a hovered index in the dropdown on mouse over.
*/
fancySelectJs.prototype.optionHover = function(ev) {
	if(!this.initialized) return;
	if(this.mouseX !== ev.clientX || this.mouseY !== ev.clientY) {
		this.mouseX = ev.clientX;
		this.mouseY = ev.clientY;
		if(ev.target.hasAttribute("data-hover")) return;
		this.highlightIndex($(ev.target).index());
	}
}

/**
*	Handles all key press events
*/
fancySelectJs.prototype.keydown = function(ev) {
	if(!this.initialized) return;
	
	if(this.disabled || this.options.length == 0) return;
	var key = ev.keyCode;

	//Handle searching within the dropdown (the dropdown is visible and a letter or a number has been pressed)
	if(this.dropdownVisible && ((key > 47 && key < 58) || (key > 64 && key < 91) || (key > 95 && key < 106))) {
		clearTimeout(this.searchTimer);
		//Record recent key strokes
		this.searchString += String.fromCharCode(key);
		//Search for a matching label in the dropdown
        var foundIndex = -1;
        for(var i = 0, j = this.options.length; i < j; i++) {
            if(this.options[i].label.toUpperCase().replace(/\s/,"").startsWith(this.searchString)) {
                foundIndex = i;
                break;
            }
        }
		//Schedule the deletion of the pushed keystrokes
        this.searchTimer = setTimeout(this.resetSearchString.bind(this), 800);
        if(foundIndex === -1) return;
		//If there is a match, highlight it in a multiselect, or select in in a single select
		if(this.multiple) this.highlightIndex(foundIndex);
		else this.selectIndex(foundIndex);
		//Scroll the selection into view
        this.scrollOptionIntoView(foundIndex);
        return;
	}
	//Space
	if(key == 32) {
		//Stop the screen from scrolling
		ev.preventDefault();
		//Select the hovered index
		if(this.dropdownVisible && this.hoverIndex != null) this.selectIndex(this.hoverIndex);
		return;
	}
	//Enter
	if(key == 13) {
		if(this.dropdownVisible) {
			this.hideDropdown();
			//Stop the form from submitting if the select box is open
			ev.preventDefault();
		}
		return;
	}
	//Escape key
	if(key == 27) {
		if(this.dropdownVisible) {
			this.hideDropdown();
			ev.preventDefault();
		}
		return;
	}
	//Down key or Up key
	if(key == 40 || key == 38) {
		if(this.dropdownVisible) {
			//Down key
			if(key == 40) {
				if(this.hoverIndex == null) this.hoverIndex = this.options.length - 1;
				else this.hoverIndex++;
			} else {//Up key
				if(this.hoverIndex == null) this.hoverIndex = 0;
				else this.hoverIndex--;
			}
			//Handle index overflow
			if(this.hoverIndex < 0) this.hoverIndex = this.options.length - 1;
			else if(this.hoverIndex >= this.options.length) this.hoverIndex = 0;
			//Update gui
			if(this.multiple) this.highlightIndex(this.hoverIndex);
			else this.selectIndex(this.hoverIndex);
			this.scrollOptionIntoView(this.hoverIndex);
			//Stop the screen from scrolling
			ev.preventDefault();
		}
		return;
	}
}

fancySelectJs.prototype.resetSearchString = function() {
	if(!this.initialized) return;
	clearTimeout(this.searchTimer);
	this.searchString = "";
}

/**
*	Designed to handle the dropdown's deselect (blur) event
*/
fancySelectJs.prototype.blur = function(ev) {
	if(!this.initialized) return;
	//Another Fix for Microsoft's broken browser
    if(document.activeElement === this.DOM_dropdown) {
        e.target.focus();  
        return;
    }
	this.hideDropdown();
}


/**
*	Stops the select box main area from losing focus on click of the dropdown.
*/
fancySelectJs.prototype.dropdownMousedown = function(ev) {
	if(!this.initialized) return;
	ev.preventDefault();    
}

/**
*	Handles the onclick events on the non-option areas of the dropdown.
*/
fancySelectJs.prototype.selectClick = function(ev) {
	if(!this.initialized) return;
	if(!this.disabled && $(ev.target).hasClass("select")) this.toggleDropdown();
}

/**
*	Clears the select box.
*/
fancySelectJs.prototype.reset = function() {
	if(!this.initialized) return;
	this.selectedIndices = [];
	this.values = [];
	this.updateValues();
}

/**
*	Sets the value of the search box
*/
fancySelectJs.prototype.setValue = function(value) {
	if(!this.initialized && !this.initializing) return;
	this.selectedIndices = [];
	this.values = [];
	this.allIndexSelected = false;
	if((typeof value != "string" && typeof value != "object") || value == null || value == "") return;
	var o, newValues = fancySelectJs.parseData(value, this.DELIMITER);
	//Determine the value type
	if(!Array.isArray(newValues)) throw new TypeError('fancySelectJs.setValue requires either a string or an array to function');
	//Parse the values into the dropdown
	for(var i = 0, j = this.options.length; i < j; i++) {
		o = this.options[i];
		if(newValues.includes(o.value.trim())) {
			this.selectedIndices.push(i);
			this.values.push(o);
		}
	}
	if(this.initialized) this.updateValues();
}

/**
*	Attempts to convert arbritary input data into an array of values that will be accepted by the
*	JQuery $(select_element).val(data) function.
*	Note that this is 'static' and called as follows: var i = fancySelectJs.parseData(data);
*	Returns an array on success, a null on failure
*/
fancySelectJs.parseData = function(value, delimiter) {
	if(typeof delimiter == "undefined" || !!delimiter) delimiter = ",";
	if(typeof value == "string") {
		value = value.trim();
		var s1 = value.substr(0,1), s2 = value.substr(value.length - 1, 1);
		if((s1 == '[' && s2 == ']') || (s1 == '(' && s2 == ')')) var out = value.substr(1, value.length - 2).split(delimiter);
        else out = value.split(delimiter);
        //Trim each element
        for(var i = 0, j = out.length; i < j; i++) {
         	out[i] = out[i].trim();   
        }
        return out;
	} else if(Array.isArray(value)) return value;
	return null;
}

/**
*	Gets the value of the search box
*/
fancySelectJs.prototype.getValue = function() {
	if(!this.initialized) return;
	return $(this.template).val();
}

/* State change functions */
/**
*	Disables a fancySelectJs, rendering it non-selectable and non-changeable by the user.
*/
fancySelectJs.prototype.disable = function() {
	if(!this.initialized) return;
	this.disabled = true;
	this.select.setAttribute("data-disabled", "true");
	this.select.tabIndex = -1;
	this.hideDropdown();
	this.template.disabled = true;
}

/**
*	Enables a fancySelectJs, rendering it selectable and changeable by the user.
*/
fancySelectJs.prototype.enable = function() {
	if(!this.initialized) return;
	this.disabled = false;
	this.select.removeAttribute("data-disabled");
	this.select.tabIndex = 0;
	this.template.disabled = false;
}

/* Gui control functions */
fancySelectJs.prototype.highlightIndex = function(index) {
	if(!this.initialized) return;
	var o, c = this.dropdown.children;
	for(var i = 0, j = c.length; i < j; i++) {
		o = c[i];
		if(i == index) {
			o.setAttribute("data-hover", "true");
			this.hoverIndex = i;
		} else o.removeAttribute("data-hover");
	}
}

/**
*	Shows the dropdown box.
*/
fancySelectJs.prototype.showDropdown = function() {
	if(!this.initialized) return;
	if(!this.dropdownVisible) {
		this.queuePositionDropdown();
		this.select.setAttribute("data-dropdown", "visible");
		this.dropdown.setAttribute("data-visible", "true");
		this.dropdownVisible = true;
	}
}

/**
*	Hides the dropdown box.
*/
fancySelectJs.prototype.hideDropdown = function() {
	if(!this.initialized) return;
	if(this.dropdownVisible) {
		this.select.removeAttribute("data-dropdown");
		this.dropdown.removeAttribute("data-visible");
		this.dropdownVisible = false;
	}
}

/**
*	Toggles the dropdown box.
*/
fancySelectJs.prototype.toggleDropdown = function() {
	if(!this.initialized) return;
	if(this.dropdownVisible) this.hideDropdown();
	else this.showDropdown();
}

/**
*	Calculates the correct position for the dropdown box.  Queues the dropdown box to reposition
*	on the next animation frame.
*/
fancySelectJs.prototype.queuePositionDropdown = function() {
	if(!this.initialized) return;
	var selectDom = this.select;
	//If the main select is not visible
    if(selectDom.offsetParent === null) this.hideDropdown();
	else {
		//Get some working variables
		var parentDom = this.parent;
        var offset = $(selectDom).offset();
        var scrollParentOffset = $(parentDom).offset();
		//Store the old dropdown position (no point in updating the position if it hasn't changed)
		var oldTop = this.dropdownTop, oldLeft = this.dropdownLeft, oldWidth = this.dropdownWidth;
        if(parentDom == document.body) {
			//Get the correct dropdown position relative to the document body
            this.dropdownTop = offset.top - scrollParentOffset.top + $(selectDom).outerHeight(false) + parseInt($(parentDom).css('marginTop'));
            this.dropdownLeft = offset.left - scrollParentOffset.left + parseInt($(parentDom).css('marginLeft'));
        } else {
			//Get the correct dropdown position relative to the scroll parent
            this.dropdownTop = offset.top - scrollParentOffset.top + $(parentDom).scrollTop() + $(selectDom).outerHeight();        
            this.dropdownLeft = offset.left - scrollParentOffset.left + $(parentDom).scrollLeft();
        }
        this.dropdownWidth = Math.floor($(selectDom).outerWidth(false));
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
fancySelectJs.prototype.positionDropdown = function() {
	if(!this.initialized) return;
    $(this.dropdown).css({top: this.dropdownTop, left: this.dropdownLeft});
    $(this.dropdown).outerWidth(this.dropdownWidth);
    this.frameRequested = false;
}

/**
*	Scrolls the select option at a given index into view within the dropdown
*/
fancySelectJs.prototype.scrollOptionIntoView = function(index) {
	if(!this.initialized) return;
	//Get the selected option
	var dropdown = this.dropdown;
	var option = dropdown.children[index];
    //Scroll dropdown to show option
    var optTop = $(option).position().top;
    var optHt = $(option).innerHeight();
    var dropTop = $(dropdown).offset().top;
    var dropHt = $(dropdown).innerHeight();
    if(optTop < 0) dropdown.scrollTop += optTop;
    else if(optTop + optHt > dropHt) dropdown.scrollTop += (optTop + optHt - dropHt);
    //Scroll window into view
    if($(option).offset().top < $(window).scrollTop()) option.scrollIntoView(true);
    else if($(option).offset().top + $(option).innerHeight() > $(window).scrollTop() + window.innerHeight) option.scrollIntoView(false);
}
