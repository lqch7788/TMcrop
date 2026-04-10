import { Thermometer, Droplets, Sun, Wind, Activity } from 'lucide-react';

interface IoTSensor {
  id: string;
  greenhouseId: string;
  greenhouseName: string;
  type: string;
  typeName: string;
  value: number;
  unit: string;
  status: string;
  lastUpdate: string;
}

interface IoTSensorCardProps {
  sensor: IoTSensor;
}

export function IoTSensorCard({ sensor }: IoTSensorCardProps) {
  const getIcon = () => {
    switch (sensor.type) {
      case 'air_temp': return <Thermometer className="w-5 h-5" />;
      case 'air_humidity': return <Droplets className="w-5 h-5" />;
      case 'soil_moisture': return <Droplets className="w-5 h-5" />;
      case 'light': return <Sun className="w-5 h-5" />;
      case 'co2': return <Wind className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const getStatusColor = () => {
    switch (sensor.status) {
      case 'normal': return 'bg-emerald-100 text-emerald-700';
      case 'warning': return 'bg-yellow-100 text-yellow-700';
      case 'critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-gray-100 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white rounded-lg text-gray-600">
          {getIcon()}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-900">{sensor.typeName}</p>
          <p className="text-xs text-gray-500">{sensor.greenhouseName}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-gray-900">
          {sensor.value}<span className="text-xs text-gray-500 ml-1">{sensor.unit}</span>
        </p>
        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor()}`}>
          {sensor.status === 'normal' ? '正常' : sensor.status === 'warning' ? '预警' : '告警'}
        </span>
      </div>
    </div>
  );
}
