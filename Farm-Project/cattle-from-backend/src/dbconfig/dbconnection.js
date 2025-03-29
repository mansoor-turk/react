const pgp = require("pg-promise")(/* options */);
const  db = pgp('postgres://postgres:12345678@localhost/postgres');

module.exports=db