# fancySelectJs
An custom JavaScript select / multi-select / multi-check box

Purpose:
- To create a lightweight stylable alternative to the standard HTML select boxes.
- To have multi-select / multi-check functionality
- To be Salesforce compatible

Notes: (Important stuff)
- This requires JQuery
- All options must have a value attribute set
- All options values must not contain any commas

Some instructions: (not too many)

	Initialization:
		1.  Reference the js/multiSelect.min.js script with your page
		2.  Ditto, but for the css/multiSelect.css an JQuery
		3.  Add some styling (mainly width)
		4.  Create a HTML text box
		5.  With JavaScript, create a new multiselect

	Quick example:
	<html>
		<head>
			<!-- begin steps 1 & 2 -->
			<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>
			<script src="js/fancySelectJs.js"></script>
			<link rel="stylesheet" type="text/css" href="css/fancySelectJs.css"/>
			<!-- end steps 1 & 2 -->
			<!-- begin step 3 -->
			<style>
				.fancySelectJs {
					width: 200px;
				}
			</style>
			<!-- end step 3 -->
		</head>
		<body>
			<!-- begin step 4 -->
			<select id="mySelectId">
				<option value="1">One</option>
				<option value="2">Two</option>
				<option value="3">Three</option>
			</select>
			<!-- end step 4 -->
			<script>
				/* begin step 5 */
				var fancyselect = new fancySelectJs(document.getElementById("mySelectId"));
				/* end step 5 */			
			</script>
		</body>
	</html>
	
	Additional options:
		There are a few ways you can affect how fancySelectJs behaves.
			1.	You can set html attributes on the SELECT element:
			
				Useful SELECT attributes to set on the parent element:
					Attribute			Effect
					
					data-id				This sets the id attribute on the fancySelectJs
					
					class				This class will be applied to the new SELECT box
					
					data-placeholder	The placeholder text to use when nothing is selected
					
					multiple			Should this be a multiselect box
					
					data-value			By default, multiselect will inherit its value from the HTML
										SELECT element it replaces on initialization.  However, you
										may be working in a framework (looking at you salesforce) that
										doesn't give you the flexibility you need to set the
										default value you need.  Or perhaps you want your SELECT to
										initialize with no default value.  Either way, use this
										attribute to override the initial SELECT box default value.
										
					data-scroll-parent	You usually won't need this - but if you do, it's here.
										Basically, if you are displaying this fancySelect on a modal,
										fixed position, or scrollable element, then it's parent position
										and resize/scroll movement will differ from that of the document
										body.  Set this to the ID of the closest scrolling/fixed/weird
										element to ensure the dropdown part of the fancySelect positions
										correctly.
										
					disabled			Is this SELECT box disabled?
					
					data-all-index		This allows you to specify an "All" option in a multi-check
										fancySelectJs.  If this "All" option is checked, all other
										options become unchecked (but the selects value reflects all).
										Check out the demo.html for an example.
										
										Note also, that this attribute takes precedence over the
										data-all attribute that you can specify on the OPTION elements.
										
										The index should be a number equal to 0 or greater, but less than
										number of OPTION elements contained within the SELECT.
				
					data-prefix			Enter any text that should appear before the selection in the closed
										fancySelectJs box here.  For example, where data-prefix="Sort By:", the
										fancySelectJs will show "Sort By: SELECTED_VALUE".
										
				Useful OPTION attributes to set on one OPTION element:
					data-all			Sets this to an "All" option which silently selects everything
										as per the data-all-index attribute above.  Note that this can
										only be applied to one OPTION element per SELECT.
										
										Also, note that this attribute will have no effect is the
										data-all-index attribute is set on the parent SELECT element.
										
										Both these options exist, for, unforseen framework compatibility
										issues... ugh.
										
			2.	You can use the following JavaScript functions on an initialized fancySelectJs object:
				
				DELIMITER
					This defines the delimiter character that the fancySelectJs will use.  This is set to
					a comma by default.  The current version of fancySelectJs has not accounted for this
					being changed.
					
				init()
					Initializes an uninitialized fancySelectJs instance.  This should not be required in
					common use.
				
				destroy()
					Destroys a fancySelectJs instance and removes all related elements from the DOM.  Also
					restores the original select box.
					
					This method would only be required under some circumstances, such as when a window
					containing a fancySelect is dynamically rebuilt.
					
				reset()
					Clears a fancySelectJs.  This function automatically runs when the fancySelectJs's
					parent form (if any) fires its onreset event.
					
				setValue(String value)
					Clears the fancy select and sets it to a given value or to a DELIMITER separated list of
					values.
		
				getValue() : String
					Return a string containing the value of the fancySelectJs.  The same could be
					achieved by selecting the original HTML SELECT element with JQuery and running the
					JQuery val() function - i.e. var value = $("#someHtmlSelect").val();
					
				disable()
					Disables the fancySelectJs.
					
				enable()
					Enables the fancySelectJs.
					
				fancySelectJs.parseData(String data, [String delimiter])
					This "static" function will attempt to parse a string or array input into an array
					that can be used to set the value of a HTML SELECT element with JQuery's
					$(elem).val(new_value) function.
					
					The function will attempt to parse the supplied data using the supplied delimiter if
					that data is a String.  If no delimiter is supplied, a comma will be used by default.
					
					This function will return an array on success, and a null value on failure.
					
			3.	Accessing the fancySelectJs class after initialization:

				There are two ways in which you can access a specific fancySelectJs instance after it
				has been initialized.
				
					a)	Store the fancySelectJs object as a variable:
						e.g.
							var someSelectElement = document.getElementById("mySelectId");
							var storedFancySelect = new fancySelectJs(someSelectElement);
							//Oh yeah! I can use this variable later on
							storedFancySelect.setValue("ducks!");
							
					b)	Retrieve it from the original SELECT element:
						e.g.
							var someSelectElement = document.getElementById("mySelectId");
							(function() {
								var storedFancySelect = new fancySelectJs(someSelectElement);
							})();
							
							function changeThatValue() {
								//Oh shit - I wanna change the fancySelect value, but the variables
								//now out of scope because I didn't store it...  All is LOST!!! or is it?
								var retrievedFancySelect = someSelectElement.fancySelectJs;
								//Yesss!  Now I can do this important thing I need to do!
								retrievedFancySelect.setValue(retrievedFancySelect.getValue());
							}
							
			4.	Polyfills:
			
				Ading fancySelectJs to your page will also add polyfills for Array.includes(value),
				Array.isArray(value), and Array.indexOf(value) as per Mozilla's specifications.
					
					
Ugh, that's all.  As you were.
