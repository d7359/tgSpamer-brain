const MainController = require('./MainController');
const TgAccounts = require('../models/TgParsings');

class tgAccountsController extends MainController{

}

const tgAccountsControllerCls = new tgAccountsController(TgAccounts);

module.exports = tgAccountsControllerCls;