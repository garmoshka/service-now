var swisTransformEmulator = Class.create();
swisTransformEmulator.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	transformEmulator: function(importRec, wizard){
	  
	  /***********************************************************************************
	  *Description: Takes the import set and counts the number of updates and inserts. Checks that the values for reference fields are valid. 
	  *Parameters: importRec - the glide record of the import set created in the SWIS Easy Import record producer; wizard - the glide record of the configuration record selected in the record producer. This determines what transform map is used as well as some other options.
	  *Returns: updates - number of updates that will be made with the import; inserts - number of inserts; html - an html table containing any reference values that are invalid
	  **************************************************************************************/
    //Get the field maps from the transform map 
		var trans = new GlideRecord('sys_transform_map');
		trans.get(wizard.u_transform_map);
		var fieldMap = new GlideRecord('sys_transform_entry');
		fieldMap.addQuery('map', trans.sys_id);
		fieldMap.query();
		var transField = [];
		var transObj;
		var targetTable = trans.target_table;
		//Create array of field map source fields
		while(fieldMap.next()){
			transObj = {};
			transObj.source = fieldMap.source_field.toString();
			transObj.target = fieldMap.target_field.toString();
			transField.push(transObj);
		}
    
		//Find the display field for the target table
		var targetDisplay = this.getDisplayField(trans.target_table).toString();
		var displayIndex = transField.map(function(x) {return x.target; }).indexOf(targetDisplay);
		//Find the corresponding source field name
		var sourceDisplay = transField[displayIndex].source;
		//Create array of reference fields from target table
		var grTarget = new GlideRecord(trans.target_table);
		grTarget.query();
		grTarget.next();
		var targetElems = grTarget.getFields();
		var refArray = [];
		var obj = {};
		//If the wizard is configured to Update only, add the unique key of the target table to the list of references to check, so that it is included in the possible 'Missing References' error
		if(wizard.u_update_only == true){
			obj.table = targetTable;
			obj.field = targetDisplay;
			obj.source = sourceDisplay;
			refArray.push(obj);
		}
		for(var i=0; i< targetElems.size(); i++){
			obj = {};
			var glideElement = targetElems.get(i).getED();
			var type = glideElement.getInternalType();
			var fieldName = glideElement.getName();
			if(type == 'reference'){
				var refField= grTarget.getElement(fieldName); //Is this different from glideElement??
				var refTable = refField.getReferenceTable();
				var sourceArr = transField.filter(function(el){
					return el.target.indexOf(fieldName) > -1;
				});
				if(sourceArr[0].source != undefined && sourceArr[0].source != 'undefined' && sourceArr[0].source != ''){
					obj.table = refTable;
					obj.field = fieldName;
					obj.source = sourceArr[0].source;
					refArray.push(obj);
				}
			}
		}
				
		var grImport = new GlideRecord(importRec.table_name);
		grImport.addQuery('sys_import_set', importRec.sys_id); //Import set created by Record Producer
		grImport.query();
		var refErr = [];
		var sourceReferenceArr = [];
		var importObj;
		var referenceMatch;
		var targetMatch;
		var referenceElem;
		var update = 0;
		var insert = 0;
		var referenceIndex;
		var filterArr;
		var sourceVal;
		var referenceSourceVal;
		var referenceTargetTable;
		//Iterate through import set and check reference fields and count Updates and Inserts
		while(grImport.next()){
			//For each import set record, check for existing record in the target table. Possible future enhancement: Determine if there are any changes. If no changes, add to a separate list - "No changes"
			sourceVal = grImport.getValue(sourceDisplay);
			targetMatch = this.mapToTarget(sourceVal, targetTable, targetDisplay);
			if(targetMatch == true)
				update += 1;
			else if(wizard.u_update_only == false)
				insert += 1;
			
			for(var j=0; j<refArray.length; j++){
				//For each reference field, get the source value and build an array with the value and referenced table. Only add unique table => value pairs. The way to get only unique pairs is clunky, but I was having trouble getting alternative solutions to work in SN. Please let me know if you have a better way that works.
				referenceSourceVal = grImport.getValue(refArray[j].source);
				referenceTargetTable = refArray[j].table;
				importObj = {};
				filterArr = [];
				filterArr = sourceReferenceArr.filter(function(el){
					if(el.table == referenceTargetTable && el.value == referenceSourceVal)
						return true;
					else
						return false;
				});
				//Add the value if it is not already in the array
				if ((!Array.isArray(filterArr) || !filterArr.length) && referenceSourceVal != null) {
					importObj.value = grImport.getValue(refArray[j].source);
					importObj.table = refArray[j].table;
					sourceReferenceArr.push(importObj);
				}	
			}
		}
		for(var p=0; p< sourceReferenceArr.length; p++){
			//For each unique reference value, match up the source field to an existing record on the referenced table. If none is found, add the field name and table to the array of errors
			var elem = this.getDisplayField(sourceReferenceArr[p].table);
			referenceMatch = this.mapToTarget(sourceReferenceArr[p].value, sourceReferenceArr[p].table, elem);
			if(referenceMatch == false){
				sourceReferenceArr[p].table = this.getTableDisplay(sourceReferenceArr[p].table);
				refErr.push(sourceReferenceArr[p]);
			}
		}
		// sort by table
		refErr.sort(function(a, b) {
			var nameA = a.table.toUpperCase(); // ignore upper and lowercase
			var nameB = b.table.toUpperCase(); // ignore upper and lowercase
			if (nameA < nameB)
				return -1;
			if (nameA > nameB)
				return 1;
			// names must be equal
			return 0;
		});
		var html;
		if(refErr.length == 0){
			html = '<td style="color:green; padding-left:5px">0</td>';
		}else{
			html = '<td><table table-layout="fixed" border="1" class="table table-striped import_summary"><thead><tr><th>Value</th><th>Table</th></tr></thead>';
			for (var u in refErr) {
			html+='<tr>';
			html+='<td style="padding-right:100px">'+refErr[u].value + '</td>';
			html+='<td style="padding-right:100px">'+refErr[u].table+'</td>';

			html+='</tr>';
		}
			html+='</table></td>';

	}
			var responseJSON = new global.JSON();
			var response = {
				refErr: html,
				updates: update,
				inserts: insert
			};
			
			return responseJSON.encode(response);



	},
getDisplayField: function (table){
	//Find the display field for the table in question so we know what query parameter to use
	var response = {};
	var grColumn = new GlideRecord('sys_dictionary');
	grColumn.addQuery('display', true);
	grColumn.addQuery('name', table);
	grColumn.query();
	if(grColumn.next())
		return grColumn.element;
},
mapToTarget: function (value, table, elem){
	//Check for a corresponding record from the referenced table based on the imported value of the reference field
	var grRef = new GlideRecord(table);
	grRef.addQuery(elem, value);
	grRef.query();
	if(grRef.next())
		return true;
	else 
		return false;
},
getTableDisplay: function(table){
	//Get the human name of the table
	var grTable = new GlideRecord(table);
	grTable.query();
	grTable.next();
	gs.log('Display table: ' + grTable.getClassDisplayValue());
	return grTable.getClassDisplayValue();
},
submitTransform: function(){
	// Start appropriate transform map (will have the logic for logging exceptions within the transform map scripts, and will trigger an email once complete to the import submitter)
	var transformMap = this.getParameter('sysparm_transformMap');
	var importSet = this.getParameter('sysparm_importSet');
	var transformWorker = new GlideImportSetTransformerWorker(importSet, transformMap);
	transformWorker.setBackground(true);
	transformWorker.start();
	this.addInfoMessage("The transform has started.");
	return 'true';
},
deleteImportSet: function(){
	var importSetID = this.getParameter('sysparm_importSet');
	var dataSourceID = this.getParameter('sysparm_dataSource');
	var grImport = new GlideRecord('sys_import_set');
	grImport.get(importSetID);
	var importrec = grImport.sys_id;
	grImport.deleteRecord();
	var grDataSource = new GlideRecord('sys_data_source');
	grDataSource.get(dataSourceID);
	var datarec = grDataSource.sys_id;
	grDataSource.deleteRecord();
	return 'Successfully deleted records, Import Set: ' + importrec + ', Data Source: ' + datarec;
	},
    type: 'EasyImportHelper'
});
