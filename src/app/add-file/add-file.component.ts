import { Component, OnInit } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, AngularFirestoreDocument } from '@angular/fire/firestore';
import { xmlParser } from './add-file.xmlParser';
import { NgForm } from '@angular/forms';
import { AlertService } from '../services/alert.service';
import { AngularFireAuth } from '@angular/fire/auth';

@Component({
  selector: 'app-add-file',
  templateUrl: './add-file.component.html',
  styleUrls: ['./add-file.component.css']
})
export class AddFileComponent implements OnInit {
  xmlCollection;
  jsonDoc;
  xmlParser;
  document$;
  json;
  local: Boolean;
  Url: Boolean;
  isAdmin: Boolean;

  constructor(private db: AngularFirestore,private alertService: AlertService, private afAuth: AngularFireAuth) { 
    this.xmlCollection = db.collection("XmlFile");
    this.xmlParser = new xmlParser();
    //this.downloadFile();
  }
  
  ngOnInit() {
    this.local=false;
    this.Url=false;

    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        var userDocument = this.db.collection("users").doc(res.uid);
        var user: any = userDocument.valueChanges();
        user.subscribe(value => {
          this.isAdmin = !!value.userRank && value.userRank==2;
        });
      } else {
        this.isAdmin = false;
      }
    });
  }

  URL(){

    this.Url=!this.Url
    this.local=false;
  }

  Local(){

    this.local= !this.local;
    this.Url=false;
   
  }


  // Add document from url
  onSubmitForm(form: NgForm){
     // Create the xml parser
    this.convertXmlIntoJsonAndSendItToCollection( this.xmlParser.getCodesetWithUrl(form.value['url']) ); // Put the data into the object

  }

  //Add document from File
  readFile = (e) => {
    const file = e.target.files[0];
    if (!file) {
        return;
    }
    const reader = new FileReader();
    reader.onload = (evt) => {
        const xmlData: string = (evt as any).target.result;
        this.convertXmlIntoJsonAndSendItToCollection(this.xmlParser.getCodesetWithFile(xmlData));
    };
    reader.readAsText(file);
}

  convertXmlIntoJsonAndSendItToCollection(codeset){
    try{
    this.jsonDoc = JSON.stringify(codeset); // Create a json string from the codeset
    this.jsonDoc = JSON.parse(this.jsonDoc); // Convert Json String into Json Object
    // Then add the json object into data base: 
    this.addDocumentIntoCollection(this.xmlCollection, codeset.label, this.jsonDoc);
    }catch(e){
      this.alertService.error("Impossible to add your file");
    }
  }

  getDocument(){
    this.document$ = this.xmlCollection.valueChanges();
  }

  // Add o document to a collection
  addDocumentIntoCollection(collection, documentName:string, data){
    if(this.isAdmin == false) {
      return;
    }
    
    try{
    collection.doc(documentName).set(data);
    this.alertService.success("The document has been added successfully");
  }catch(e){
    this.alertService.error("Impossible to add your file");
  }
}
}

function getFieldInXml(str: String){
  try{
  var i = 0;
  while (i<str.length){
    if (str[i] == '<'){
      i++;
      var field = ""
      while (str[i] != '>'){
        field += str[i];
        i++;
      }
      return field;
    }
    i++;
  }
  return false;
}catch(e){
  this.alertService.error("Impossible to add your file");

}

function OrderCodeXML(xml: String){
  
  var newXml = "";
  var lines = xml.split('\n');
  var done = false;
  var index = 0;
  var orderList = [["value"], ["label"], ["description"], ["code-status"], 
                    ["reference"], ["use-date"], ["use-age"], 
                    ["concept-type"], ["test-age"]]; 
  while (index < 4){
    newXml += lines[index] + "\n";
    index ++; 
  }

  while (done == false) {
  
    if (lines[index].includes("<code>")){
      index ++;
      while (lines[index].includes("</code>") == false){
        var field = getFieldInXml(lines[index]);
        
        orderList.forEach(element => {
          if (element[0] == field){
            var fieldLines = lines[index]+"\n";
            while (lines[index].includes("</"+field+">") == false){
              index ++; 
              fieldLines += lines[index]+"\n"; 
            }
            element.push(fieldLines);
          }
        });
        index++;  
      }
      newXml += "  " + "<code>\n";
      orderList.forEach(element => {
        /*if ((element[0] === "use-date") && (element.length === 1)){
          element.push("<use-date/>\n");
        }*/
        if (element.length > 1){
          newXml += element[1];
          element.pop();
        }
        
      });
      newXml += "  " + "</code>\n";
    }

    index ++; 
    if (index >= lines.length)  done = true;
    
  }

 return newXml + "</codeset>"; 
}

function OBJtoXML(obj, ident) {
  var xml = '';
  var re = /\_/gi;
  for (var prop in obj) {
      if(obj[prop] instanceof Array) {
        if (prop == "reference" && obj[prop].length > 0) {
          xml += ident + "<" + prop.replace(re, '-') + ">" + "\n";
          for (var array in obj[prop]){
            var object = new Object(obj[prop][array]);
            xml += ident + "  "+ "<link-to codeset=" + object["type"] + ">" + object["codeValue"] + "</link-to>\n"; 
          }
          xml += ident + "</" + prop.replace(re, '-') + ">" + "\n";
        }
        else {  
          for (var array in obj[prop]) {
                xml += ident + "<" + prop.replace(re, '-') + ">" + "\n"; 
                xml += OBJtoXML(new Object(obj[prop][array]), ident + "  ");
                xml += ident + "</" + prop.replace(re, '-') + ">\n";
            }
        }
      } else if (typeof obj[prop] == "object") {
        
          if (prop == "use_date"){
            var first_time = true;
            
              var object = new Object(obj[prop]);
              for (var o in object){
                
                if (first_time == true) {
                  xml += ident + "<" + prop.replace(re, '-') + ">" + "\n";
                  first_time = false;
                }
                xml += ident + "  " + "<" + o.replace(re, '-') + ">";
                xml += object[o];
                xml += "</" + o.replace(re, '-') + ">\n"; 
              }
            if (first_time == false) {
              xml += ident + "</" + prop.replace('_', '-') + ">" + "\n";
            }
          }
          else if (prop == "use_age"){
            var first_time = true;
            
            var object = new Object(obj[prop]);
            var temp = ""; 
            for (var o in object){
              
              if (first_time == true) {
                xml += ident + "<" + prop.replace(re, '-') + ">" + "\n";
                first_time = false;
              }
              temp += ident + "  " + "<" + o.replace(re, '-') + ">";
              temp += object[o];
              temp += "</" + o.replace(re, '-') + ">\n"; 
            }
            if (first_time == false) {
              var tab = temp.split('\n');
              if (tab.length > 1){
                xml += tab[1] + "\n";
                xml += tab[0] + "\n";
              }
              else if (tab.length>0){
                xml += tab[0] + "\n";
              }
              xml += ident + "</" + prop.replace('_', '-') + ">" + "\n";
            }
          }

          else {
            xml += ident + "<" + prop.replace(re, '-') + ">" + "\n";
            xml += OBJtoXML(new Object(obj[prop]), ident + "  ");
            xml += ident +  "</" + prop.replace(re, '-') + ">\n";
          }
      } else {
        if (prop == "status"){
          xml += ident + "<code-status>\n"; 
          xml += ident + "  "  + "<" + prop.replace(re, '-') + ">"
          xml += obj[prop];
          xml += "</" + prop.replace(re, '-') + ">\n";
          xml += ident + "</code-status>\n"; 
        }
        else if (obj[prop] != '' && obj[prop] != null) {
          xml += ident + "<" + prop.replace(re, '-') + ">";
          xml += obj[prop];
          xml += "</" + prop.replace(re, '-') + ">\n";
        }
      }
  }
  var xml = xml.replace(/<\/?[0-9]{1,}>/g,'')
  return xml
}


}

