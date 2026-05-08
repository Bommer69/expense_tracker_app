const express = require('express');
const { getAll, createOrUpdate, remove } = require('../controllers/savingsGoalController');

const router = express.Router();

router.get('/', getAll);
router.post('/', createOrUpdate);
router.delete('/:id', remove);

module.exports = router;
