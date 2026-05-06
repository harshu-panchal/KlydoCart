import { Request, Response } from "express";
import HeaderCategory from "../../../models/HeaderCategory";

// @desc    Get all header categories (Admin)
// @route   GET /api/v1/header-categories/admin
// @access  Private/Admin
export const getAdminHeaderCategories = async (
  _req: Request,
  res: Response
) => {
  try {
    const categories = await HeaderCategory.find().sort({
      order: 1,
      createdAt: -1,
    });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Get published header categories (Public)
// @route   GET /api/v1/header-categories
// @access  Public
export const getHeaderCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await HeaderCategory.find({ status: "Published" }).sort({
      order: 1,
      createdAt: -1,
    });
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ message: "Server Error", error });
  }
};

// @desc    Create a header category
// @route   POST /api/v1/header-categories
// @access  Private/Admin
export const createHeaderCategory = async (req: Request, res: Response) => {
  try {
    const {
      name,
      iconLibrary,
      iconName,
      slug,
      relatedCategory,
      image,
      status,
      order,
    } = req.body;

    // Check if category with same name or slug exists
    const categoryExists = await HeaderCategory.findOne({ 
      $or: [
        { name: name.trim() },
        { slug: slug }
      ]
    });

    if (categoryExists) {
      const field = categoryExists.name === name.trim() ? "Name" : "Theme/Slug";
      return res
        .status(400)
        .json({ message: `Header category with this ${field} already exists` });
    }

    const category = await HeaderCategory.create({
      name: name.trim(),
      iconLibrary,
      iconName,
      slug,
      relatedCategory,
      image,
      status,
      order,
    });

    return res.status(201).json(category);
  } catch (error: any) {
    console.error("Create Header Category Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// @desc    Update a header category
// @route   PUT /api/v1/header-categories/:id
// @access  Private/Admin
export const updateHeaderCategory = async (req: Request, res: Response) => {
  try {
    const {
      name,
      iconLibrary,
      iconName,
      slug,
      relatedCategory,
      image,
      status,
      order,
    } = req.body;
    const category = await HeaderCategory.findById(req.params.id);

    if (category) {
      // Check if name is being updated and if it's already taken
      if (name && name.trim() !== category.name) {
        const nameExists = await HeaderCategory.findOne({ name: name.trim() });
        if (nameExists) {
          return res
            .status(400)
            .json({ message: "Header category with this name already exists" });
        }
      }

      // Check if slug is being updated and if it's already taken
      if (slug && slug !== category.slug) {
        const slugExists = await HeaderCategory.findOne({ slug });
        if (slugExists) {
          return res
            .status(400)
            .json({ message: "Theme/Slug already used by another category" });
        }
      }

      category.name = name ? name.trim() : category.name;
      category.iconLibrary = iconLibrary || category.iconLibrary;
      category.iconName = iconName || category.iconName;
      category.slug = slug || category.slug;
      category.relatedCategory = relatedCategory; // Allow clearing it
      category.image = image; // Allow updating/clearing image
      category.status = status || category.status;
      category.order = order !== undefined ? order : category.order;

      const updatedCategory = await category.save();
      return res.json(updatedCategory);
    } else {
      return res.status(404).json({ message: "Header category not found" });
    }
  } catch (error: any) {
    console.error("Update Header Category Error:", error);
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Category with this slug/theme already exists" });
    }
    return res
      .status(500)
      .json({ message: "Server Error", error: error.message });
  }
};

// @desc    Delete a header category
// @route   DELETE /api/v1/header-categories/:id
// @access  Private/Admin
export const deleteHeaderCategory = async (req: Request, res: Response) => {
  try {
    const deletedCategory = await HeaderCategory.findByIdAndDelete(req.params.id);

    if (deletedCategory) {
      return res.json({ message: "Header category removed successfully" });
    } else {
      return res.status(404).json({ message: "Header category not found" });
    }
  } catch (error: any) {
    console.error("Delete Header Category Error:", error);
    return res.status(500).json({ message: "Server Error", error: error.message });
  }
};
