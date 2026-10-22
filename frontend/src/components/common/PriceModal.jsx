import React from 'react'
import { X } from 'lucide-react'

// const WECHAT_QR = '/assets/images/wechat-qr.jpeg'
const WHATSAPP_QR = '/assets/images/whatsapp-qr.png'
const SERVICE_TIME = '周一至周五 14:00-17:00'

function PriceModal({ saleInfo, onClose }) {
    if (!saleInfo) return null

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-night-overlay rounded-2xl shadow-2xl max-w-3xl w-full p-10 md:p-12 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-night-200"
                >
                    <X className="w-7 h-7" />
                </button>

                <h3 className="text-3xl font-bold text-gray-900 dark:text-night-100 mb-6">
                    购买信息
                </h3>

                {saleInfo.sale_price != null && (
                    <p className="text-4xl font-bold text-red-600 dark:text-red-400 mb-8">
                        ¥{saleInfo.sale_price}
                    </p>
                )}

                <div className="flex gap-12 justify-center mb-8">
                    {/* <div className="text-center">
                        <img
                            src={WECHAT_QR}
                            alt="微信二维码"
                            className="w-64 h-64 object-contain border border-gray-200 dark:border-night-700 rounded-xl"
                        />
                        <p className="text-base text-gray-500 dark:text-night-400 mt-3">微信扫码联系</p>
                    </div> */}
                    <div className="text-center">
                        <img
                            src={WHATSAPP_QR}
                            alt="WhatsApp二维码"
                            className="w-64 h-64 object-contain border border-gray-200 dark:border-night-700 rounded-xl"
                        />
                        <p className="text-base text-gray-500 dark:text-night-400 mt-3">WhatsApp扫码联系</p>
                    </div>
                </div>

                <p className="text-base text-gray-500 dark:text-night-400 text-center border-t border-gray-100 dark:border-night-700 pt-5">
                    客服时间：{SERVICE_TIME}
                </p>
            </div>
        </div>
    )
}

export default PriceModal