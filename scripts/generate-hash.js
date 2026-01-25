const bcrypt = require('bcryptjs');

const password = process.argv[2];

if (!password) {
    console.error('Please provide a password as an argument.');
    process.exit(1);
}

const hash = bcrypt.hashSync(password, 10);
console.log(hash);
