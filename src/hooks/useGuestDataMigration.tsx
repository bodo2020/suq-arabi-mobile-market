
import { useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const useGuestDataMigration = () => {
  const { user } = useUser();
  const { toast } = useToast();

  useEffect(() => {
    const migrateGuestData = async () => {
      if (!user) return;

      try {
        // Check if we have guest location data
        const guestLocationData = localStorage.getItem('guestLocationData');
        const guestAddress = localStorage.getItem('userAddress');
        const guestArea = localStorage.getItem('userArea');
        const guestNeighborhood = localStorage.getItem('userNeighborhood');
        const guestLat = localStorage.getItem('userLatitude');
        const guestLng = localStorage.getItem('userLongitude');

        if (guestLocationData || guestAddress) {
          console.log('Migrating guest data for user:', user.id);

          // Parse guest location data if available
          let locationData = null;
          if (guestLocationData) {
            try {
              locationData = JSON.parse(guestLocationData);
            } catch (e) {
              console.error('Error parsing guest location data:', e);
            }
          }

          // Prepare address data for migration
          const addressData = {
            user_id: user.id,
            address: guestAddress || locationData?.address || '',
            latitude: locationData?.coordinates?.lat || (guestLat ? parseFloat(guestLat) : null),
            longitude: locationData?.coordinates?.lng || (guestLng ? parseFloat(guestLng) : null),
            is_default: true
          };

          // Check if user already has addresses
          const { data: existingAddresses } = await supabase
            .from('customer_addresses')
            .select('id')
            .eq('user_id', user.id);

          if (!existingAddresses || existingAddresses.length === 0) {
            // Create address from guest data
            const { error: addressError } = await supabase
              .from('customer_addresses')
              .insert(addressData);

            if (addressError) {
              console.error('Error migrating guest address:', addressError);
            } else {
              console.log('Successfully migrated guest address data');
              
              // Update customer profile with location data
              await supabase
                .from('customers')
                .update({
                  address: addressData.address
                })
                .eq('user_id', user.id);

              toast({
                title: "تم نقل بياناتك",
                description: "تم حفظ عنوانك المحدد مسبقاً",
              });
            }
          }

          // Migrate cart data if exists
          const guestCartData = localStorage.getItem('cart');
          if (guestCartData) {
            try {
              const cartItems = JSON.parse(guestCartData);
              if (Array.isArray(cartItems) && cartItems.length > 0) {
                // Get customer ID
                const { data: customerData } = await supabase
                  .from('customers')
                  .select('id')
                  .eq('user_id', user.id)
                  .single();

                if (customerData) {
                  // Migrate cart items
                  const cartMigrationPromises = cartItems.map(async (item: any) => {
                    const { error } = await supabase
                      .from('cart_items')
                      .insert({
                        user_id: user.id,
                        customer_id: customerData.id,
                        product_id: item.id,
                        quantity: item.quantity || 1,
                        metadata: item.metadata || null
                      });
                    
                    if (error) {
                      console.error('Error migrating cart item:', error);
                    }
                  });

                  await Promise.all(cartMigrationPromises);
                  console.log('Successfully migrated guest cart data');
                }
              }
            } catch (e) {
              console.error('Error migrating guest cart data:', e);
            }
          }

          // Clean up guest data from localStorage
          localStorage.removeItem('guestLocationData');
          localStorage.removeItem('userAddress');
          localStorage.removeItem('userArea');
          localStorage.removeItem('userNeighborhood');
          localStorage.removeItem('userLatitude');
          localStorage.removeItem('userLongitude');
          localStorage.removeItem('selectedLat');
          localStorage.removeItem('selectedLng');
          localStorage.removeItem('selectedAddress');
          localStorage.removeItem('cart');
          
          console.log('Guest data migration completed and cleaned up');
        }
      } catch (error) {
        console.error('Error during guest data migration:', error);
      }
    };

    // Only migrate if user just logged in
    if (user) {
      const migrationKey = `migrated_${user.id}`;
      const hasMigrated = localStorage.getItem(migrationKey);
      
      if (!hasMigrated) {
        migrateGuestData();
        localStorage.setItem(migrationKey, 'true');
      }
    }
  }, [user, toast]);

  return null;
};
