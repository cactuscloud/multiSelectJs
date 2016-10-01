# multiSelectJs
An custom JavaScript select / multi-select and/or auto-completing search box

Purpose:
- 	To create a lightweight stylable alternative to the standard HTML select boxes.
- 	To have multi-select and autocomplete search functionality with the possibility of
	server-side database searching.
- 	To be Salesforce compatible

Compatibility:
-	Firefox
-	Chrome
-	ie9+
-	Safari 5+ (Tested with Safari 5 (Windows) and Safari 10 (OSX El Capitan)

Notes: (Important stuff)
- This requires JQuery

Some instructions: (not too many)

	Initialization:
		1.  Reference JQuery and the js/multiSelect.min.js script with your page
		2.  Ditto, but for the css/multiSelect.css 
		3.  Add a placeholder div
		5.  Using JavaScript, initialize the multiselect

	Quick example:
	<html>
		<head>
			<!-- begin steps 1 & 2 -->
			<script src="https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js"></script>
			<script src="js/multiSelectJs.min.js"></script>
			<link rel="stylesheet" type="text/css" href="css/multiSelectJs.css"/>
			<!-- end steps 1 & 2 -->
		</head>
		<body>
			<!-- begin step 3 -->
			<div id="placeholderId" class="multiSelectJs-placeholder"></div>
			<!-- end step 3 -->
			<script>
				/* begin step 4 */
				var multiselect = new multiSelectJs("placeholderId");
				/* end step 4 */			
			</script>
		</body>
	</html>
	
	Additional options:
		There are a few ways you can affect how multiSelectJs behaves.
			1.	The multiSelectJs data type:
			
				All data used by multiSelectJs is stored in the multiSelectJs.Data data type.  This
				data type can be constructed as follows:
					new multiSelectJs.Data("label text", "unique value");
				
				This data is always accepted and returned in an array.
			
				Alternatively, data can be entered in the following format:
					{value: "", label: ""}
				
				This data also is always handled as an array, i.e:
					[{value: "", label: ""}, ...]
					
			2.	The following options may be set in the constructor:
				id
					The HTML ID to apply to the new multiSelectJs main div element
					
				duplicateInput
					A text or hidden input field to store the selected values in.  This is useful for
					integration with other frameworks, such as SalesForce, or for use with default
					HTML form submission.  This value can be either a text ID or a reference to an
					actual text or hidden element.
					
				data
					Any preloaded data to insert into the multiSelectJs.  This data will be searched
					when the user enters a search string.  This will not be used if a custom search function
					is used.
					
					This value should be of the data type specified above (see point 1).
					
				scrollParent
					The scroll parent for this multiSelectJs.  This is useful for selects placed
					on a modal or dialog that doesn't scroll with the body.  This parameter
					accepts an element ID or a reference to an element.
					
				placeholder
					The placeholder text that appears when there is no text entered into the
					multiSelectJs.
					
				noResultsMessage
					The text which should appear when a search string returns no results
					
				maxSelections
					The maximum number of options the user may select
					
				maxResults
					The maximum number of results that may appear after a search
					
				delimiter
					The delimiter to use when return data as a string
					
				selections
					Any preselected options set for this multiSelectJs instance.  These are the options
					that should already be selected once the multiSelectJs loads.

					This value should be of the data type specified above (see point 1).
					
				searchMethod
					A custom search method that may allow for server side request integration.
					This should point to a JavaScript method that can take up to three parameters.
					This function should have the following format:

					function myCustomFunction(searchTerms, currentSelections, thisInstance) {
						//Let's assume the following function contacts the server and
						//calls its second argument as a callback upon completion
						makeServerRequest(searchTerms, currentSelections, function(result) {
							//Test that request was successful
							//Next format data in a manner that can be accepted by multiSelectJs
							//Finally, call the multiSelectJs callback function
							thisInstance.searchCallback(result.dataArray);
						}
					}
					
					There is an example of this in the demo file - just using a timer instead of 
					an actual server side search.
					
				submitEvent
					The event to fire when the multiSelectJs is submitted (i.e. when the multiSelectJs
					dropdown is hidden and the enter key is struck).  If this option is not specified,
					and the multiSelectJs is within a form, that form will be submitted as normal.
				
				disabled
					Determines whether the multiSelectJs should initialize in a disabled state.
					
					Accepts either a boolean, or a string equal to true or false.  If this option is
					not specified, this defaults to false.
					
				salesForceRemotingMethod
					An alternative to the submitEvent.  This allows direct integration with SalesForce
					remoting, accepting a remote action that outputs a class containing a List two Strings,
					titled "value" and "label".  i.e.
						
						public class MultiSelectJsData {
							public String value {get; set;}
							public String label {get; set;}
						}
						
						@RemoteAction
						public static List<MultiSelectJsData> MyRemoteAction(searchTerms, currentSelections) {
							return getTheOutputHere(searchTerms, currentSelections);
						}
					
					Setting this value will also set the submitEvent option appropriately, unless this value
					has already been set.					
										
			3.	You can use the following JavaScript functions on an initialized fancySelectJs object:
				
				new multiSelectJs([Various placeholderElement, Object options]) : multiSelectJs
					The multiSelectJs constructor. This will create and initialize a multiSelectJs
					instance.  This can take up to two arguments:
					-	placeholderElement
							An optional (but recommended) string pointing to a unique HTML element ID
							or a reference to a HTML element loaded into the DOM.  This can point to
							any element, but should be a DIV with the className of 
							"multiSelectJs-placeholder" for styling purposes.
							
							If this value is not supplied, the multiSelectJs will be created, but not
							initialized.  The uninitialized multiSelectJs can then be initialized later
							using the init() function.
					-	options
							This is an optional set of options that can be applied to change the
							default behaviour of the multiSelectJs instance.  The available options
							are described above in section 2.
							
							Here is an example of the constructor in use with some options specified:
								var options = {maxResults: 5,
											   maxSelections: 3,
											   placeholder: "Select something!"};
								var multiselect = new multiSelectJs("elementId", options);
								
				init(Various placeholderElement, [Object options]) : void
					Initializes a constructed multiSelectJs instance.  This method should only be
					required if a multiSelectJs has been constructed without providing any arguments,
					or if a multiSelectJs has been initialized and then uninitialized using the
					destroy() function.
					-	placeholderElement
							A string pointing to a unique HTML element ID or a reference to a HTML element
							loaded into the DOM.  This can point to any element, but should be a DIV with
							the className of "multiSelectJs-placeholder" for styling purposes.
					-	options
							This is an optional set of options that can be applied to change the
							default behaviour of the multiSelectJs instance.  The available options
							are described above in section 2.
							
				getValue() : String
					Returns a string containing the current value of the multiSelect.  Each entry in the
					result will be separated by the character specified in the delimiter option described
					in section 2 (a semi-colon by default).
					
					This function will return null if the multiSelectJshas not been initialized.
						
				getSelections() : Array
					Returns an array of the multiSelect's currently selected values.  The data will be an
					array of objects in the format described above in section 1.
						
					This function will return null if the multiSelectJs has not been initialized.
						
				setSelections(Array selections)
					Sets the current selections to the value specified in the function's argument.
					
					The argument supplied should be in the format described above in section 1.
						
				addSelections(Array selections)
					Appends the currently selected values with values specified in the function's
					argument.
					
					The argument supplied should be in the format described above in section 1.

				removeSelections(Array selections)
					Removes the specified selections from the multiSelect's currently selected
					data.
					
					The argument supplied should be in the format described above in section 1.

				reset()
					Clears the currently selected data from the multiSelectJs instance.
					
				focus()
					Focusses the multiSelectJs
					
				blur()
					Blurs the multiSelectJs
				
			4.	Accessing the multiSelectJs class after initialization:

				There are two ways in which you can access a specific multiSelectJs instance after it
				has been initialized.
				
					a)	Store the multiSelectJs object as a variable:
						e.g.
							var someElement = document.getElementById("myId");
							var storedMultiSelect = new multiSelectJs(someElement);
							//Oh yeah! I can use this variable later on
							var data = storedMultiSelect.getSelections();
							
					b)	Retrieve it from the originally supplied element:
						e.g.
							var someElement = document.getElementById("mySelectId");
							new multiSelectJs(someElement);
							
							function changeThatValue() {
								//Oh shit - I wanna change the multiSelect value, but the variables
								//gone because I didn't store it...  All is LOST!!! or is it?
								var retrievedMultiSelect = someElement.multiSelectJs;
								//Yesss!  Now I can do this important thing I need to do!
								retrievedMultiSelect.setSelections(retrievedMultiSelect.getSelections());
							}
							
			4.	Polyfills:
			
				Ading fancySelectJs to your page will also add polyfills for Array.isArray(value)
				as per Mozilla's specifications.
					
					
Ugh, that's all.  As you were.