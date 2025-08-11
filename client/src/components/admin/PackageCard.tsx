import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Users, DollarSign, Settings, Edit, Trash2 } from 'lucide-react';
import type { PackageWithTiers } from '@shared/schema';

interface PackageCardProps {
  packageData: PackageWithTiers;
  onEdit: (pkg: PackageWithTiers) => void;
  onDelete: (id: string) => void;
}

export function PackageCard({ packageData, onEdit, onDelete }: PackageCardProps) {
  const formatPrice = (amountMinor: number, currency: string) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
    }).format(amountMinor / 100);
  };

  const getLowestPrice = () => {
    let lowest = Infinity;
    packageData.tiers.forEach(tier => {
      tier.prices.forEach(price => {
        if (price.amountMinor < lowest) {
          lowest = price.amountMinor;
        }
      });
    });
    return lowest === Infinity ? 0 : lowest;
  };

  const activeTiers = packageData.tiers.filter(tier => tier.isActive);
  const lowestPrice = getLowestPrice();

  return (
    <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors" data-testid={`card-package-${packageData.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-400" />
              {packageData.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge
                variant={packageData.isActive ? "default" : "secondary"}
                className={packageData.isActive ? "bg-green-600" : "bg-gray-600"}
              >
                {packageData.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge variant="outline" className="text-indigo-400 border-indigo-400">
                {packageData.category}
              </Badge>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(packageData)}
              className="text-gray-400 hover:text-white"
              data-testid={`button-edit-package-${packageData.id}`}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(packageData.id)}
              className="text-gray-400 hover:text-red-400"
              data-testid={`button-delete-package-${packageData.id}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <p className="text-gray-300 text-sm">{packageData.description}</p>
        
        {/* Package Products */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Settings className="h-4 w-4" />
            <span>Products ({packageData.products.length})</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {packageData.products.map((product) => (
              <Badge key={product.id} variant="outline" className="text-xs">
                {product.name}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Pricing Tiers */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <DollarSign className="h-4 w-4" />
            <span>Pricing Tiers ({activeTiers.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {activeTiers.slice(0, 4).map((tier) => (
              <div key={tier.id} className="bg-gray-700 rounded-lg p-3 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-white text-sm font-medium">{tier.name}</h4>
                  {tier.promotionalTag && (
                    <Badge variant="secondary" className="text-xs bg-indigo-600">
                      {tier.promotionalTag}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1">
                  {tier.prices.map((price, index) => (
                    <div key={index} className="text-xs text-gray-300">
                      {formatPrice(price.amountMinor, price.currency || 'GBP')}/{price.interval}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-400">
                  {tier.limits.length} product limits
                </div>
              </div>
            ))}
          </div>
          {activeTiers.length > 4 && (
            <p className="text-xs text-gray-400">
              +{activeTiers.length - 4} more tiers
            </p>
          )}
        </div>
        
        {/* Package Summary */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Starting from
          </div>
          <div className="text-lg font-semibold text-white">
            {lowestPrice > 0 ? formatPrice(lowestPrice, 'GBP') : 'Free'}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}