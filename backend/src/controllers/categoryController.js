/**
 * Category Controller
 */

const Category = require('../models/Category');
const { getUserId } = require('../utils/auth');

async function getAll(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const { type } = req.query;
    const query = { userId };
    if (type) query.type = type;
    
    const categories = await Category.find(query).sort({ isDefault: -1, name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const category = await Category.create({ ...req.body, userId });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId },
      req.body,
      { new: true }
    );
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const category = await Category.findOneAndDelete({ 
      _id: req.params.id, 
      userId, 
      isDefault: false 
    });
    
    if (!category) {
      return res.status(404).json({ error: 'Category not found or cannot be deleted' });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { getAll, create, update, remove };