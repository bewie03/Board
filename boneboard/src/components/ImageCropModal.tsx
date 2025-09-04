import React, { useState, useRef, useCallback, useEffect } from 'react';
import Modal from './Modal';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  onCropComplete: (croppedImageBlob: Blob) => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  onCropComplete
}) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 400, height: 400 });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load image when file changes
  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageUrl(url);
      
      // Reset position and zoom
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      
      return () => URL.revokeObjectURL(url);
    }
  }, [imageFile]);

  // Handle image load to get dimensions
  const handleImageLoad = useCallback(() => {
    if (imageRef.current && containerRef.current) {
      const img = imageRef.current;
      const container = containerRef.current;
      
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      
      const containerRect = container.getBoundingClientRect();
      setContainerSize({ width: containerRect.width, height: containerRect.height });
      
      // Center the image initially
      const imgAspect = img.naturalWidth / img.naturalHeight;
      const containerAspect = containerRect.width / containerRect.height;
      
      let displayWidth, displayHeight;
      if (imgAspect > containerAspect) {
        displayWidth = containerRect.width;
        displayHeight = containerRect.width / imgAspect;
      } else {
        displayHeight = containerRect.height;
        displayWidth = containerRect.height * imgAspect;
      }
      
      setPosition({
        x: (containerRect.width - displayWidth) / 2,
        y: (containerRect.height - displayHeight) / 2
      });
    }
  }, []);

  // Mouse/touch event handlers for dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    
    setPosition({ x: newX, y: newY });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Handle zoom change
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoom(Math.max(0.5, Math.min(3, newZoom)));
  }, []);

  // Generate cropped image
  const handleCrop = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const img = imageRef.current;
    const cropSize = 300; // Final output size
    
    canvas.width = cropSize;
    canvas.height = cropSize;
    
    // Calculate the source rectangle (what part of the original image to crop)
    const imgAspect = imageSize.width / imageSize.height;
    const containerAspect = containerSize.width / containerSize.height;
    
    let displayWidth, displayHeight;
    if (imgAspect > containerAspect) {
      displayWidth = containerSize.width;
      displayHeight = containerSize.width / imgAspect;
    } else {
      displayHeight = containerSize.height;
      displayWidth = containerSize.height * imgAspect;
    }
    
    // Apply zoom
    displayWidth *= zoom;
    displayHeight *= zoom;
    
    // Calculate the crop area in the original image coordinates
    const cropAreaSize = Math.min(containerSize.width, containerSize.height);
    const cropX = (containerSize.width / 2 - cropAreaSize / 2 - position.x) / displayWidth * imageSize.width;
    const cropY = (containerSize.height / 2 - cropAreaSize / 2 - position.y) / displayHeight * imageSize.height;
    const cropWidth = (cropAreaSize / displayWidth) * imageSize.width;
    const cropHeight = (cropAreaSize / displayHeight) * imageSize.height;
    
    // Draw the cropped image
    ctx.drawImage(
      img,
      Math.max(0, cropX),
      Math.max(0, cropY),
      Math.min(cropWidth, imageSize.width - Math.max(0, cropX)),
      Math.min(cropHeight, imageSize.height - Math.max(0, cropY)),
      0,
      0,
      cropSize,
      cropSize
    );
    
    // Convert to blob
    canvas.toBlob((blob) => {
      if (blob) {
        onCropComplete(blob);
        onClose();
      }
    }, 'image/jpeg', 0.9);
  }, [imageSize, containerSize, zoom, position, onCropComplete, onClose]);

  const modalContent = (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Adjust Your Profile Picture
        </h3>
        <p className="text-sm text-gray-600">
          Drag to reposition and use the slider to zoom. The circular area shows your final profile picture.
        </p>
      </div>
      
      {/* Image crop area */}
      <div className="flex justify-center">
        <div 
          ref={containerRef}
          className="relative w-96 h-96 border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 cursor-move"
          style={{ touchAction: 'none' }}
        >
          {imageUrl && (
            <>
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Profile preview"
                className="absolute select-none"
                style={{
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: 'top left',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}
                onLoad={handleImageLoad}
                onMouseDown={handleMouseDown}
                draggable={false}
              />
              
              {/* Crop overlay */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                
                {/* Circular crop area */}
                <div 
                  className="absolute border-4 border-white rounded-full bg-transparent"
                  style={{
                    width: '280px',
                    height: '280px',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)'
                  }}
                ></div>
              </div>
              
              {/* Invisible drag area */}
              <div 
                className="absolute inset-0 cursor-move"
                onMouseDown={handleMouseDown}
              ></div>
            </>
          )}
        </div>
      </div>
      
      {/* Zoom control */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Zoom: {Math.round(zoom * 100)}%
        </label>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={zoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>50%</span>
          <span>300%</span>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex space-x-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleCrop}
          className="flex-1 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Apply Changes
        </button>
      </div>
      
      {/* Hidden canvas for cropping */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
    >
      {modalContent}
    </Modal>
  );
};

export default ImageCropModal;
