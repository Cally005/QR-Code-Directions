// app/page.tsx
'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Download, Info, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function QRCodeGenerator(): React.ReactElement {
  const [destinationAddress, setDestinationAddress] = useState<string>('')
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [locationInfo, setLocationInfo] = useState<{name: string, lat: number, lng: number} | null>(null)

  const generateQRCode = async (): Promise<void> => {
    setError('')
    setIsGenerating(true)
    
    try {
      if (!destinationAddress.trim()) {
        throw new Error('Please enter a destination address')
      }

      // Encode the address for URL
      const encodedAddress = encodeURIComponent(destinationAddress)
      
      // Use OpenStreetMap Nominatim API for geocoding (free and doesn't require API key)
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`;
      
      try {
        const response = await fetch(geocodeUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'QRDirectionsGenerator' // Required by Nominatim usage policy
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to geocode address');
        }
        
        const data = await response.json();
        
        if (!data || data.length === 0) {
          throw new Error('Address not found. Please try a more specific address.');
        }
        
        const location = data[0];
        const lat = parseFloat(location.lat);
        const lng = parseFloat(location.lon);
        
        setLocationInfo({
          name: location.display_name,
          lat: lat,
          lng: lng
        });
        
        // Create Google Maps URL with coordinates
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
        
        // Generate QR code using an API
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(googleMapsUrl)}`;
        setQrCodeUrl(qrApiUrl);
        
        toast.success("QR code generated successfully");
        
      } catch (geocodeError) {
        console.error('Geocoding error:', geocodeError);
        
        // Fallback to direct address if geocoding fails
        toast.warning("Could not find exact coordinates. Using address directly.");
        const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
        const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(googleMapsUrl)}`;
        setQrCodeUrl(qrApiUrl);
        setLocationInfo(null);
      }
      
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
        toast.error(err.message);
      } else {
        setError('An unknown error occurred');
        toast.error('An unknown error occurred');
      }
      setQrCodeUrl('');
      setLocationInfo(null);
    } finally {
      setIsGenerating(false);
    }
  }

  const copyLink = (): void => {
    if (!qrCodeUrl) return;
    
    // Extract the original Google Maps URL from the QR code URL
    const urlParams = new URLSearchParams(qrCodeUrl.split('?')[1]);
    const googleMapsUrl = decodeURIComponent(urlParams.get('data') || '');
    
    navigator.clipboard.writeText(googleMapsUrl)
      .then(() => {
        toast.success("Google Maps link copied to clipboard!");
      })
      .catch((err: unknown) => {
        console.error('Failed to copy: ', err);
        toast.error("Could not copy the link to clipboard.");
      });
  }

  const downloadQR = (): void => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'directions-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("QR Code downloaded successfully");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white">
          <CardTitle className="text-2xl font-bold flex items-center">
            <MapPin className="mr-2" /> QR Directions Generator
          </CardTitle>
          <CardDescription className="text-blue-50">
            Create a QR code that opens Google Maps directions
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Destination Address or Place</Label>
              <Input
                id="address"
                placeholder="Enter location (e.g., Eiffel Tower, Paris, France)"
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Enter any address, landmark, or place name
              </p>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Button 
            className="w-full mt-6" 
            onClick={generateQRCode}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                Generating...
              </>
            ) : (
              'Generate QR Code'
            )}
          </Button>
          
          {locationInfo && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
              <p className="text-sm font-medium">Location found:</p>
              <p className="text-sm text-gray-600 mt-1">{locationInfo.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                Coordinates: {locationInfo.lat.toFixed(6)}, {locationInfo.lng.toFixed(6)}
              </p>
            </div>
          )}
          
          {qrCodeUrl && (
            <div className="mt-6 flex flex-col items-center">
              <Separator className="mb-6" />
              <div className="bg-white p-4 rounded-md border">
                <img
                  src={qrCodeUrl}
                  alt="QR Code for Google Maps Directions"
                  className="w-full max-w-[200px] h-auto"
                />
              </div>
              <p className="text-sm text-gray-500 mt-2 text-center">
                Scan this code to open Google Maps directions
              </p>
            </div>
          )}
        </CardContent>
        
        {qrCodeUrl && (
          <CardFooter className="flex justify-between pt-2">
            <Button variant="outline" size="sm" onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" /> Copy Link
            </Button>
            <Button variant="outline" size="sm" onClick={downloadQR}>
              <Download className="mr-2 h-4 w-4" /> Download
            </Button>
          </CardFooter>
        )}
      </Card>
      
      <div className="mt-6 text-center text-sm text-gray-500 flex items-center">
        <Info className="mr-1 h-4 w-4" />
        <span>This app generates QR codes that open Google Maps directions when scanned.</span>
      </div>
    </div>
  )
}