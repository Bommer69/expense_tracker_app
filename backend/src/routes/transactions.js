const express = require('express');
const { getAll, create, update, remove, getSummary } = require('../controllers/transactionController');

const router = express.Router();

router.get('/', getAll);
router.post('/', create);
router.put('/:id', update);
router.delete('/:id', remove);
router.get('/summary', getSummary);

module.exports = router;