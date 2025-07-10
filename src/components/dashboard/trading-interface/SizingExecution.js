import React from 'react';

const SizingExecution = ({ inputs, handleInputChange, getQuantityForLots }) => {
  return (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700/50">
      <h3 className="text-lg font-semibold text-white mb-4">2. Sizing & Execution</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="ce-lots" className="text-sm font-medium text-slate-400">CE Lots</label>
          <input
            type="number"
            id="ce-lots"
            name="ceLots"
            value={inputs.ceLots}
            onChange={(e) => handleInputChange('ceLots', e.target.value)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white"
          />
          <p className="text-xs text-slate-500 mt-1">Qty: {getQuantityForLots('ce')}</p>
        </div>
        <div>
          <label htmlFor="pe-lots" className="text-sm font-medium text-slate-400">PE Lots</label>
          <input
            type="number"
            id="pe-lots"
            name="peLots"
            value={inputs.peLots}
            onChange={(e) => handleInputChange('peLots', e.target.value)}
            className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white"
          />
          <p className="text-xs text-slate-500 mt-1">Qty: {getQuantityForLots('pe')}</p>
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="product-type" className="text-sm font-medium text-slate-400">Product Type</label>
            <select
              id="product-type"
              name="productType"
              value={inputs.productType}
              onChange={(e) => handleInputChange('productType', e.target.value)}
              className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white"
            >
              <option>INTRADAY</option>
              <option>CNC</option>
            </select>
          </div>
          <div>
            <label htmlFor="order-type" className="text-sm font-medium text-slate-400">Order Type</label>
            <select
              id="order-type"
              name="orderType"
              value={inputs.orderType}
              onChange={(e) => handleInputChange('orderType', e.target.value)}
              className="mt-1 block w-full bg-slate-700 border-slate-600 rounded-md shadow-sm focus:ring-brand focus:border-brand text-white"
            >
              <option>MARKET</option>
              <option>LIMIT</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SizingExecution; 