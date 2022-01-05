var express = require('express');
var router = express.Router();
const Verifier = require("email-verifier");
const { array } = require('yargs');

const ObjectsToCsv = require('objects-to-csv');
const e = require('express');
const CSVToJSON = require('csvtojson');
const csv = require('csv-parser')
const fs = require('fs')




/* GET home page. */

class EmailBot {

    constructor(args) {
      this.config = require('./config/puppeteer.json');
      this.args = args;
      this.map = new Map();
    }
    
    async initPuppeter() {
      const puppeteer = require('puppeteer');
      this.browser = await puppeteer.launch({
          headless: this.config.settings.headless,
          args: ['--no-sandbox',
          '--disable-setuid-sandbox'],
          ignoreDefaultArgs: ['--disable-extensions'],
      });
      this.page = await this.browser.newPage();
      this.page.setViewport({width: 1200, height: 764});
    }


    async validateEmail(email) {
      await this.page.setDefaultNavigationTimeout(0);
      await this.page.goto('https://emailverification.whoisxmlapi.com/api/v2?apiKey=at_HgRoFl03AoTXTiymwKGMO5cwt0ZJz&emailAddress='+email+"&checkCatchAll=0&checkFree=0&checkDisposable=0", {waitUntil: "domcontentloaded"})

      var cont = await this.page.content(); 

      var innerTxt = await this.page.evaluate(() =>  {
          return JSON.parse(document.querySelector("body > pre").innerText); 
      }); 

      //console.log(innerTxt);

      if(innerTxt.formatCheck=="true" && innerTxt.smtpCheck=="true" && innerTxt.dnsCheck=="true") return true;
      else return false;


    }

    async category() {

      await this.page.setDefaultNavigationTimeout(0);
      await this.page.goto(this.config.base_url)
      await this.page.waitForSelector(`#category-select > option`)

      const elementHandles = await this.page.$$('#category-select > option')
      console.log(elementHandles.length)

      var f=elementHandles.length,k=2;
      while(f>0){
        var data = []
        f-=1;
        await this.page.setDefaultNavigationTimeout(0);
        await this.page.goto(this.config.base_url)
        await this.page.waitForSelector(`#category-select > option:nth-child(${k})`).catch((e)=>e.message)
        let element = await this.page.$(`#category-select > option:nth-child(${k})`).catch((e)=>e.message)
        let category = await this.page.evaluate(el => el.textContent, element).catch((e)=>e.message)
        var cat = category
        category = category.toLowerCase();
        

        var id = await this.page.$eval(`#category-select > option:nth-child(${k})`, (elm) => elm.value).catch((e)=>e.message)
        category = category.concat(`-${id}`);
        console.log(category)
        
        await this.page.goto(this.config.base_url+`category/${category}?q=&c=${id}&sa=False`)
        await this.page.waitForTimeout(2500);

        await this.page.waitForSelector("#results-found > span.gz-subtitle.gz-results-count").catch((e)=>e.message)
        let elem = await this.page.$("#results-found > span.gz-subtitle.gz-results-count").catch((e)=>e.message)
        let count = await this.page.evaluate(el => el.textContent, elem).catch((e)=>e.message)

        for(var i=1;i<=count;i++){
          let element = await this.page.$(`#gzns > div > div.row.gz-cards.gz-results-cards > div:nth-child(${i}) > div > div.card-body.gz-card-top > h5 > a`)
          let comp = await this.page.evaluate(el => el.textContent, element)
          comp = comp.toString();
          data.push({company:comp, category:cat});
          
        }

        (async () => {
          const csv = new ObjectsToCsv(data);
        
          // Save to file:
          await csv.toDisk('./compToCat2.csv', { append: true });
        
        })();

        k+=1;
        
      }

      
      
      
      
    }

    async visitUrl() {
      
      for(var i=19;i<26;i++) {
        await this.page.goto(this.config.base_url+'searchalpha/'+String.fromCharCode(97+i), {waitUntil: "networkidle2"}).catch((e)=>console.log("error-",e.message))
        await this.page.waitForTimeout(2500);
        await this.page.waitForSelector(this.config.selectors.count_alphabet_wise)
        let element = await this.page.$(this.config.selectors.count_alphabet_wise)
        let count = await this.page.evaluate(el => el.textContent, element)
        var urls=[];
        for(j=1;j<=count;j++){
          await this.page.waitForSelector('#gzns > div > div.row.gz-cards.gz-results-cards > div:nth-child('+j+') > div > div.card-header > a')
          var link = await this.page.$eval('#gzns > div > div.row.gz-cards.gz-results-cards > div:nth-child('+j+') > div > div.card-header > a', (elm) => elm.href);
          urls.push(link);
        }
        for(var j=1;j<urls.length;j++) {
          //await this.page.click('#gzns > div > div.row.gz-cards.gz-results-cards > div:nth-child('+j+') > div > div.card-header > a')
          await this.page.waitForTimeout(2500);
          await this.page.goto(urls[j])
          await this.page.waitForSelector(this.config.selectors.url_name).catch((e)=>e.message)
          let element = await this.page.$(this.config.selectors.url_name).catch((e)=>e.message)
          let url_name = await this.page.evaluate(el => el.textContent, element).catch((e)=>e.message)
          console.log("url:",url_name);
          await this.page.setDefaultNavigationTimeout(0);
          link = await this.page.$eval(this.config.selectors.url, (elm) => elm.href).catch((e)=>e.message)
          await this.page.goto(link)
          .then(async ()=>{
            await this.page.waitForTimeout(2500);
            /* Click on the username field using the field selector*/
            var cur_url = this.page.url();
            console.log("Browsing URL: ", cur_url);
            await this.page.waitForTimeout(2500);

            
            const elementHandles = await this.page.$$('a')
            const propertyJsHandles = await Promise.all(
            elementHandles.map(handle => handle.getProperty('href'))
            );
            var hrefs = await Promise.all(
            propertyJsHandles.map(handle => handle.jsonValue())
            );

            var links = []
            
            for(let i=0;i<hrefs.length;i++) {
              if(!links.includes(hrefs[i]) && (hrefs[i].search(cur_url)>=0 || hrefs[i].search("mailto:")>=0)){
                links.push(hrefs[i])
              }
            }

            hrefs = links

            var emails = [];
            var data = [];

            for(var i=0;i<hrefs.length;i++) {
              if(data.length>=this.args.n) break;
              if(hrefs[i].slice(0,7)=="mailto:" && hrefs[i].search('\\?')<0){
                var mail = hrefs[i].slice(7);
                mail = mail.toLowerCase();
                if(!emails.some(item => item.email === mail)){
                    emails.push({"email":mail,"website":cur_url,"Company Name":url_name});
                    await this.validateEmail(mail).then((res)=> {
                      if(res==true) {
                        console.log("valid mail - ",mail);
                        data.push({"website":cur_url,"email":mail,"Company Name":url_name});
                        
                      }
                      else {
                        console.log("Invalid mail - ",mail);
                      }
                    })
                }
              }
              else{
                await this.page.goto(hrefs[i], {waitUntil: "domcontentloaded"}).catch((e)=>{
                  console.log("Error in navigating link ",hrefs[i],"- ",e.message);
                  return;
                })
                await this.page.waitForTimeout(5000);
                  
                  const elementHandles1 = await this.page.$$('a')
                  const propertyJsHandles1 = await Promise.all(
                  elementHandles1.map(handle => handle.getProperty('href'))
                  );
                  const hrefs1 = await Promise.all(
                  propertyJsHandles1.map(handle => handle.jsonValue())
                  );
                  for(var j=0;j<hrefs1.length;j++) {
                    if(hrefs1[j].search("mailto:")>=0 && hrefs1[j].search('\\?')<0){
                      if(data.length>=this.args.n) break;
                      var mail = hrefs1[j].slice(7);
                      mail = mail.toLowerCase();
                      if(!emails.some(item => item.email === mail)){
                        emails.push({"website":hrefs[i],"email":mail,"Company Name":url_name});
                        await this.validateEmail(mail).then((res)=> {
                          if(res==true) {
                            console.log("valid mail - ",mail);
                            data.push({"website":hrefs[i],"email":mail,"Company Name":url_name});
                            
                          }
                          else {
                            console.log("Invalid mail - ",mail,hrefs[i]);
                          }
                        })
                      }
                          
                    }
                  }
              }
            }

            



            (async () => {
              const csv = new ObjectsToCsv(data);
            
              // Save to file:
              await csv.toDisk('./validMails2.csv', { append: true });
            
            })();
          })
          .catch((e)=>{console.log("url not found",e.message);})
          await this.page.waitForTimeout(2500);

          await this.page.goto(this.config.base_url+String.fromCharCode(97+i), {waitUntil: "networkidle2"}).catch((e)=>console.log("error-",e.message))

        }
      }
      


    }



    

    async closeBrowser(){
      await this.browser.close();
    }


}

module.exports = EmailBot;


