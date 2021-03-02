public with sharing class ListViewController 
{
    @AuraEnabled
    public static Map<String, List<Object>> startQuery(String objectName, String fieldsetName, String soqlCondition, Integer pagination, Integer offset)
    {
        if(pagination == null) pagination = 100;
        if(offset == null) offset = 0;

        try 
        {
            String query = 'SELECT Id, ';
            List<Map<String, String>> columns = new List<Map<String, String>>();

            Schema.DescribeSObjectResult describeSObjectResultObj = Schema.getGlobalDescribe().get(objectName).getDescribe();
            Schema.FieldSet fieldSetObj = describeSObjectResultObj.FieldSets.getMap().get(fieldsetName);
            for(Schema.FieldSetMember f : fieldSetObj.getFields())
            {
                String fieldType = String.valueOf(f.getType()).toLowerCase(), fieldName = f.getFieldPath();
                Map<String, String> column = new Map<String, String>();
                column.put('label', f.getLabel());
                column.put('fieldName', fieldName);
                column.put('type', fieldType);
                if(fieldType == 'reference')
                { 
                    if(f.getLabel().endsWithIgnoreCase(' id')) { column.put('label', f.getLabel().removeEndIgnoreCase(' id')); }
                    column.put('reference', String.valueOf(f.getSObjectField().getDescribe().getReferenceTo()[0])); 
                }

                columns.add(column);
                query += fieldName + ', ';

                if(fieldType == 'reference') query += fieldName.endsWith('__c') ? fieldName.replace('__c', '__r.Name, ') : (fieldName.removeEnd('Id') + '.Name');
            }
            query = query.removeEnd(', ') + ' FROM ' + objectName + (String.isEmpty(soqlCondition) ? '' : ' WHERE ' + soqlCondition) + ' LIMIT ' + pagination + ' OFFSET ' + offset;
            
            Integer count = Database.countQuery('SELECT COUNT() FROM ' + objectName + (String.isEmpty(soqlCondition) ? '' : ' WHERE ' + soqlCondition.split('Order By')[0]));
            String hasMore = offset + pagination < count ? 'true' : 'false';
            return new Map<String, List<Object>>{ 'columns'=>columns, 'records'=>Database.query(query), 'hasMore'=>new List<String>{ hasMore } };
        } 
        catch (Exception e) 
        {
            throw new AuraHandledException(e.getMessage());
        }
    }
}
