/**
 * Parses a product name to extract the product name, category, and dimensions.
 * @param {string} fullProductName - The full product name including category and dimensions.
 * @param {string[]} categories - An array of possible category names.
 * @returns {Object} An object containing the parsed product name, category, and dimensions.
 */
export function parseProductName(fullProductName, categories) {
  // Convert the full product name to lowercase for case-insensitive matching
  const lowercaseName = fullProductName.toLowerCase();
  
  // Find the category in the product name
  const category = categories.find(cat => lowercaseName.includes(cat.toLowerCase()));
  
  if (!category) {
    // If no category is found, return the original name as is
    return { productName: fullProductName, category: null, dimensions: null };
  }
  
  // Find the index of the category in the original name (preserving case)
  const categoryIndex = fullProductName.toLowerCase().indexOf(category.toLowerCase());
  
  // Extract the product name (everything before the category)
  const productName = fullProductName.slice(0, categoryIndex).trim();
  
  // Extract the dimensions (everything after the category)
  const dimensions = fullProductName.slice(categoryIndex + category.length).trim();
  
  return { productName, category, dimensions };
}