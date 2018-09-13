# End user import with a record producer

## Business need
This application was requested by a client who needed the ability to make mass updates to records on a regular basis. They wanted to use excel to update thousands of records at once, import it without assistance from an administrator, and be able to review the data before it was imported. 

## Components
* Wizard configuration table: this is where you configure various settings for your different imports. See the link in credits for details on setup of this table.
* Record Producer: the interface for initiating the import. I don't transform the data here, as is done in the SN Guru example. Only a data source and import set are created, and the import set is analyzed to present a preview of the updates, inserts, and errors.
* UI Page: Once the record producer is submitted with a valid attachment and wizard configuration, the page redirects to a UI page displaying a summary of the import and an option to cancel or submit
* Script Include: takes the import set and compares it to the target table to provide a preview of changes. Handles Submit and Cancel of import.

## Credits
For the record producer design and wizard configuration table setup, credit is due to Jacob Anderson from SN Guru: https://www.servicenowguru.com/system-definition/imports/simplifying-data-imports-parties/
