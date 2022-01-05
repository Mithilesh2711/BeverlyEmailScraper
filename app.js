var express = require('express');
var router = express.Router();
const Bot = require('./routes/index');// this directly imports the Bot/index.js file
const yargs = require('yargs')


const argv = yargs.argv;

/* GET home page. */
const run = async () => {
    const bot = new Bot(argv);

    await bot.initPuppeter().then(() => console.log("PUPPETEER INITIALIZED"));

    //await bot.category();
    
    await bot.visitUrl().then(() => console.log("URL BROWSED"));
    

    await bot.closeBrowser().then(() => console.log("BROWSER CLOSED"));

};






run().catch(e=>console.log(e.message));
//run bot at certain interval we have set in our config file


module.exports = router;
