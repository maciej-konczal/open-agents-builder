import React from 'react';
import { DataLoaderIcon } from './data-loader-icon';

const DataLoader: React.FC = () => {
    return (
        <div className="flex justify-center items-center">
            <div role="status">
                <DataLoaderIcon />
            </div>
        </div>
    );
};

export default DataLoader;