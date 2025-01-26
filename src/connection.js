const mysql = require("mysql");
const conn = mysql.createConnection({
    host: 'sql307.infinityfree.com',
    user: 'if0_38183213',
    password: 'NI3hmsnuOXy',
    database: 'if0_38183213_XXX',
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
