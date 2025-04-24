
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";

type PickerValue = {government?: string; city?: string; area?: string; neighborhood?: string};
interface LocationPickerProps {
  value: PickerValue;
  onChange: (val: PickerValue) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ value, onChange }) => {
  const [governments, setGovernments] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<any[]>([]);
  // Load governments
  useEffect(() => {
    supabase.from("governorates").select("*").then(({ data }) => setGovernments(data || []));
  }, []);
  // Load cities
  useEffect(() => {
    if (!value.government) return setCities([]);
    supabase.from("cities").select("*").eq("governorate_id", value.government).then(({data})=> setCities(data||[]));
  }, [value.government]);
  useEffect(() => {
    if (!value.city) return setAreas([]);
    supabase.from("areas").select("*").eq("city_id", value.city).then(({data})=> setAreas(data||[]));
  }, [value.city]);
  useEffect(() => {
    if (!value.area) return setNeighborhoods([]);
    supabase.from("neighborhoods").select("*").eq("area_id", value.area).then(({data})=> setNeighborhoods(data||[]));
  }, [value.area]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="text-sm mb-1 block">المحافظة</label>
        <Select value={value.government || ""} onValueChange={val => onChange({government: val, city: "", area: "", neighborhood: ""})}>
          <SelectTrigger>
            <SelectValue placeholder="اختر محافظة" />
          </SelectTrigger>
          <SelectContent>
            {governments.map(g => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm mb-1 block">المدينة</label>
        <Select value={value.city || ""} onValueChange={val => onChange({...value, city: val, area: "", neighborhood: ""})}>
          <SelectTrigger>
            <SelectValue placeholder="اختر مدينة" />
          </SelectTrigger>
          <SelectContent>
            {cities.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm mb-1 block">المنطقة</label>
        <Select value={value.area || ""} onValueChange={val => onChange({...value, area: val, neighborhood: ""})}>
          <SelectTrigger>
            <SelectValue placeholder="اختر منطقة" />
          </SelectTrigger>
          <SelectContent>
            {areas.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-sm mb-1 block">الحي</label>
        <Select value={value.neighborhood || ""} onValueChange={val => onChange({...value, neighborhood: val})}>
          <SelectTrigger>
            <SelectValue placeholder="اختر حي" />
          </SelectTrigger>
          <SelectContent>
            {neighborhoods.map(n => (
              <SelectItem key={n.id} value={n.id}>{n.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default LocationPicker;
