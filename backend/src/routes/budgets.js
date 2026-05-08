const express = require('express');
const { getAll, createOrUpdate, update, getAlerts, remove } = require('../controllers/budgetController');

const router = express.Router();

router.get('/', getAll);
router.post('/', createOrUpdate);
router.put('/:id', update);
router.get('/alerts', getAlerts);
router.delete('/:id', remove);

module.exports = router;