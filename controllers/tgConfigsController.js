const MainController = require('./MainController');
const TgAccounts = require('../models/TgConfigs');

class tgAccountsController extends MainController{
}

const tgAccountsControllerCls = new tgAccountsController(TgAccounts);

module.exports = tgAccountsControllerCls;
