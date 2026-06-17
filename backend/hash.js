const bcrypt = require('bcryptjs');

(async () => {
  console.log("admin:", await bcrypt.hash("admin123", 10));
  console.log("prof:", await bcrypt.hash("prof123", 10));
  console.log("comptable:", await bcrypt.hash("comptable123", 10));
})();