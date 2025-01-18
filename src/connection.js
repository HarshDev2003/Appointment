const mysql = require("mysql");
const conn = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'chat',
    multipleStatements: true
});
conn.connect(function(error){
    if(error)
    {
        throw error;
    }
    else{
        console.log("Connected To Database")
    }
});
module.exports = conn;
