const sqlite3 = require('sqlite3').verbose()
const db = new sqlite3.Database('database')
const express = require('express')
const app = express()
const axios = require('axios')
const config = require('./config.js')
const cheerio = require('cheerio')
const bodyParser = require('body-parser')
const TelegramBot = require('node-telegram-bot-api')
const bot = new TelegramBot(config.TELEGRAM_BOT_ID)
const STATUS_ACTIVE = 'active'

app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static('public'))

app.get('/', (req, res) => res.send('Hello World!'))

app.post(`/new_message_${config.TELEGRAM_BOT_ID}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
})

bot.on('message', msg => {
  bot.sendMessage(msg.chat.id, 'I am alive!')
});

app.get('/stock_notifier_chan/stock_calibrate', (req, res) => {
  const message = `It's end of quarter. Please calibrate stock thresholds`
  bot.sendMessage(config.TELEGRAM_CHAT_ID, message)
  return res.send('ok');
})

app.get('/stock_notifier_chan/stock_alert', (req, res) => {

  db.serialize(function() {
    db.each("SELECT * FROM stock", function(err, row) {
      const { code, display, low_threshold_price, high_threshold_price, is_active } = row;
      if (is_active !== STATUS_ACTIVE) return;

      let instance = axios.create();
      instance.defaults.timeout = 10000;
      instance.get(`https://finance.yahoo.com/quote/${code}.JK?p=${code}.JK&.tsrc=fin-srch`)
        .then(response => {
          if (!response || !response.data || !response.status === 200) {
            return;
          }

          const $ = cheerio.load(response.data)

          const rawtext = $('#quote-header-info').text()
          const match = /^.*IDR(.*?)\..*$/.exec(rawtext)
          const price = match[1].replace(',', '')

          if (parseInt(price, 10) >= parseInt(high_threshold_price, 10)) {
            const message = `Time to sell ${code} (${display}). Current price = IDR ${price}. It's higher than or equal to high_threshold_price (${high_threshold_price}). People now are greedy.`
            bot.sendMessage(config.TELEGRAM_CHAT_ID, message)
          }
          else if (parseInt(price, 10) < parseInt(low_threshold_price, 10)) {
            const message = `Time to buy ${code} (${display}). Current price = IDR ${price}. It's lower than or equal to low_threshold_price (IDR ${low_threshold_price}). People now are fearful.`
            bot.sendMessage(config.TELEGRAM_CHAT_ID, message)
          }

          return res.end('ok')
        })
        .catch(error => {
          console.log(error)
        })
    });

  })

  return res.end('ok')

})

app.listen(config.PORT, () => console.log(`Stock notifier chan is listening on port ${config.PORT}!`))
