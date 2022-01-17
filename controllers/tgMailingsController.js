const MainController = require('./MainController');
const TgAccounts = require('../models/TgMailings');

class tgAccountsController extends MainController{


}

const tgAccountsControllerCls = new tgAccountsController(TgAccounts);

module.exports = tgAccountsControllerCls;