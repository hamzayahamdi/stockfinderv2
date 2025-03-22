import React, { useState, useCallback } from 'react'
import { FiEdit2, FiClock } from 'react-icons/fi'
import { Dialog } from '@radix-ui/react-dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import Image from 'next/image'
import { Spinner } from './spinner'

type Product = {
  'Ref. produit': string;
  'Libellé': string;
  'Prix Promo': number;
  'Total Stock': number;
  bf_price?: number;
  prix_initial?: number;
  imageUrl?: string;
}

export const BlackFridayCell: React.FC<{ product: Product }> = ({ product }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [showingHistory, setShowingHistory] = useState(false)
  const [editedProduct, setEditedProduct] = useState(product)
  const [priceHistory, setPriceHistory] = useState<Array<{ old_bf_price: number, new_bf_price: number, changed_at: string }>>([])

  const handleEditClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }, [])

  const handleHistoryClick = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowingHistory(true)
    try {
      const response = await fetch(`https://phpstack-937973-4763176.cloudwaysapps.com/data1.php?action=fetch_bf_history&product_ref=${product['Ref. produit']}`)
      const data = await response.json()
      setPriceHistory(data)
    } catch (error) {
      console.error('Error fetching price history:', error)
      setPriceHistory([])
    }
  }, [product])

  const handleSave = useCallback(async () => {
    try {
      const response = await fetch('https://phpstack-937973-4763176.cloudwaysapps.com/data1.php?action=update_bf_price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_ref: editedProduct['Ref. produit'],
          prix_initial: editedProduct.prix_initial,
          bf_price: editedProduct.bf_price,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setIsEditing(false)
        // You might want to update the product in the parent component here
      } else {
        console.error('Error updating Black Friday price:', result.error)
      }
    } catch (error) {
      console.error('Error updating Black Friday price:', error)
    }
  }, [editedProduct])

  const formatNumber = (num: number) => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }

  return (
    <div className="w-full h-full flex items-center justify-between px-2">
      <div className="font-bold uppercase text-white">
        {product.bf_price ? formatNumber(Math.round(product.bf_price)) : 'N/A'}
      </div>
      <div className="flex space-x-1">
        <button
          onClick={handleEditClick}
          className="text-white hover:bg-blue-700 transition-colors duration-200 p-0.5 rounded"
        >
          <FiEdit2 size={14} />
        </button>
        <button
          onClick={handleHistoryClick}
          className="text-white hover:bg-blue-700 transition-colors duration-200 p-0.5 rounded"
        >
          <FiClock size={14} />
        </button>
      </div>

      {isEditing && (
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-96 max-w-full z-[60]">
              <Dialog.Title className="text-xl font-bold mb-4">Edit Black Friday Price</Dialog.Title>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-24 h-24 relative">
                    <Image
                      src={editedProduct.imageUrl || 'https://via.placeholder.com/100'}
                      alt={editedProduct['Libellé']}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-md"
                    />
                  </div>
                  <div>
                    <p className="font-bold">{editedProduct['Ref. produit']}</p>
                    <p className="text-sm">{editedProduct['Libellé']}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stock Total</label>
                    <p className="mt-1 font-bold">{editedProduct['Total Stock']}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Prix Promo</label>
                    <p className="mt-1 font-bold">{formatNumber(editedProduct['Prix Promo'])} DH</p>
                  </div>
                </div>
                <div>
                  <label htmlFor="prixInitial" className="block text-sm font-medium text-gray-700">Prix Initial</label>
                  <Input
                    id="prixInitial"
                    type="number"
                    value={editedProduct.prix_initial || 0}
                    onChange={(e) => setEditedProduct({...editedProduct, prix_initial: Number(e.target.value)})}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label htmlFor="prixBF" className="block text-sm font-medium text-gray-700">Prix Black Friday</label>
                  <Input
                    id="prixBF"
                    type="number"
                    value={editedProduct.bf_price || 0}
                    onChange={(e) => setEditedProduct({...editedProduct, bf_price: Number(e.target.value)})}
                    className="mt-1"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                <Button onClick={handleSave}>Save</Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog>
      )}

      {showingHistory && (
        <Dialog open={showingHistory} onOpenChange={setShowingHistory}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
            <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg p-6 w-96 max-w-full z-[60]">
              <Dialog.Title className="text-xl font-bold mb-4">Black Friday Price History</Dialog.Title>
              <div className="space-y-4 max-h-80 overflow-y-auto">
                {priceHistory.length === 0 ? (
                  <p className="text-center text-gray-500">No price history available</p>
                ) : (
                  priceHistory.map((entry, index) => (
                    <div key={index} className="bg-gray-100 p-3 rounded-md">
                      <p className="text-sm text-gray-600">{new Date(entry.changed_at).toLocaleString()}</p>
                      <p className="font-medium">
                        {formatNumber(entry.old_bf_price)} DH → {formatNumber(entry.new_bf_price)} DH
                      </p>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowingHistory(false)}>Close</Button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog>
      )}
    </div>
  )
}
