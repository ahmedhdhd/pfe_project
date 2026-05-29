import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticate, requireTeacher } from '../middleware/auth';
import { requireOrgFeature } from '../middleware/orgFeatures';

const router = Router();

router.use(authenticate);
router.use(requireOrgFeature('categories'));
router.get('/', requireTeacher, categoryController.listCategories);
router.post('/', requireTeacher, categoryController.createCategory);
router.put('/:id', requireTeacher, categoryController.updateCategory);
router.delete('/:id', requireTeacher, categoryController.deleteCategory);

export default router;
