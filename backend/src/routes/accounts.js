const express = require('express');
const router = express.Router();
const { getAll, create, update, remove, getBalance } = require('../controllers/accountController');

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.get('/balance', getBalance);

module.exports = router;