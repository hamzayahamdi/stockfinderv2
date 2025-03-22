import { parseProductName } from '../utils/productNameParser';
import styles from './ProductModal.module.css';

// Assuming you have access to the categories array
const categories = ['Table', 'Chair', 'Sofa', 'Bed', /* other categories */];

function ProductModal({ product }) {
  const { productName, category, dimensions } = parseProductName(product.name, categories);

  return (
    <div className={styles.modal}>
      <div className={styles.header}>
        <h2 className={styles.productName}>{productName}</h2>
        {dimensions && (
          <span className={styles.dimensions}>{dimensions}</span>
        )}
      </div>
      <div className={styles.subHeader}>
        <span className={styles.ref}>Ref: {product.ref}</span>
        {category && (
          <span className={styles.category}>{category}</span>
        )}
      </div>
      {/* Rest of the modal content */}
    </div>
  );
}

export default ProductModal;