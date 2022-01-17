const MainController = require('./MainController');
const TgAccounts = require('../models/TgAccounts');

class tgAccountsController extends MainController{


}

const tgAccountsControllerCls = new tgAccountsController(TgAccounts);

module.exports = tgAccountsControllerCls;