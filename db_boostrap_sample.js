var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('database');

db.serialize(function() {
  db.run(`DROP TABLE IF EXISTS stock`)

  db.run(`CREATE TABLE stock (
    code TEXT NOT NULL UNIQUE,
    display TEXT,
    low_threshold_price INTEGER,
    high_threshold_price INTEGER,
    is_active TEXT
  )`);


  let values = `
    ('XXXX', 'PT XXXX Tbk', 7700, 8500, 'active')
  `

  db.run(`INSERT INTO stock (code, display, low_threshold_price, high_threshold_price, is_active) VALUES ${values}`);

  db.each("SELECT * FROM stock", function(err, row) {
    const { code, display, low_threshold_price, high_threshold_price, is_active } = row;
    console.log({ code, display, low_threshold_price, high_threshold_price, is_active });
  });

});

db.close();
