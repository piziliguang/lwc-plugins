import { api, LightningElement } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent'
import { NavigationMixin } from 'lightning/navigation'

import startQuery from '@salesforce/apex/ListViewController.startQuery'


export default class ListView extends NavigationMixin(LightningElement)
{
    @api iconName
    @api title

    @api fieldsetName
    @api objectName
    @api soqlCondition
    @api pagination

    offset = 0
    columns = []
    records = []
    isLoading = false
    isLoadingMore = false
    hasMore = false

    get cardTitle(){ return `${this.title} (${this.records.length})` }
    get isShowLoadMore() { return !this.isLoading && !this.isLoadMore && this.hasMore }

    async connectedCallback(){
        this.isLoading = true
        let res = await this.loadRecords()
        this.columns = res.columns
        this.records = res.records
        this.isLoading = false
    }

    async loadRecords(){
        let res = await startQuery({ objectName:this.objectName, fieldsetName:this.fieldsetName, soqlCondition:this.soqlCondition, pagination:this.pagination, offset:this.offset })

        //Handle name url
        for(let col of res.columns.filter(col=>col.fieldName=='Name')){
            let urlPattern = ''
            col.type = 'url'
            col.target = '_blank'
            col.typeAttributes = { label: { fieldName: 'NameLabel' } }

            for(let rec of res.records.filter(rec=>rec.Name)){
                rec.NameLabel = rec.Name

                if(!urlPattern){
                    let urlConfig = {
                        type: 'standard__recordPage',
                        attributes: { recordId: rec.Id, objectApiName: this.objectName, actionName: 'view' }
                    }
                    urlPattern = (await this[NavigationMixin.GenerateUrl](urlConfig)).replace(rec.Id, 'URL_PATTERN')
                }
                rec.Name = urlPattern.replace('URL_PATTERN', rec.Id);
            }
        }

        //Handle percent
        for(let col of res.columns.filter(col=>col.type=='percent')){
            for(let rec of res.records.filter(rec=>rec[col.fieldName])){
                rec[col.fieldName] = rec[col.fieldName]/100
            }
        }
        
        //Handle refernece
        for(let col of res.columns.filter(col=>col.type=='reference')){
            let fieldName = col.fieldName, urlPattern = ''
            let relationName = col.fieldName.endsWith('__c') ? col.fieldName.replace('__c', '__r') : col.fieldName.slice(0, -2)
            col.type = 'url'
            col.target = '_blank'
            col.typeAttributes = { label: { fieldName: relationName } }
            
            for(let rec of res.records.filter(rec=>rec[relationName])){
                if(!urlPattern){
                    let urlConfig = {
                        type: 'standard__recordPage',
                        attributes: { recordId: rec[fieldName], objectApiName: col.reference, actionName: 'view' }
                    };
                    urlPattern = (await this[NavigationMixin.GenerateUrl](urlConfig)).replace(rec[fieldName], 'URL_PATTERN')
                }

                rec[fieldName] = urlPattern.replace('URL_PATTERN', rec[fieldName]);
                rec[relationName] = rec[relationName] ? rec[relationName].Name : ''
            }
        }

        console.log(res)
        this.hasMore = res.hasMore[0] === 'true'
        return res;
    }

    async loadMore(){
        this.isLoadingMore = true
        this.offset += this.pagination
        let res = await this.loadRecords()
        this.records = this.records.concat(res.records)
        this.isLoadingMore = false
    }
}