# Kịch bản tỉa map Hà Nội và xử lý cho OSRM

Write-Host "Đang tỉa map Hà Nội từ map.osm.pbf..."
# Bounding box của Hà Nội khoảng: 105.28, 20.56, 106.02, 21.39
docker run --rm -v "${PWD}/data:/data" stefanb/osmium-tool osmium extract -b 105.28,20.56,106.02,21.39 /data/map.osm.pbf -o /data/hanoi.osm.pbf --overwrite

Write-Host "Đang sao lưu map gốc thành vietnam.osm.pbf..."
if (Test-Path "data/map.osm.pbf") {
    Rename-Item -Path "data/map.osm.pbf" -NewName "vietnam.osm.pbf" -ErrorAction SilentlyContinue
}

Write-Host "Đang đổi tên map Hà Nội thành map.osm.pbf..."
Move-Item -Path "data/hanoi.osm.pbf" -Destination "data/map.osm.pbf" -Force

Write-Host "Xóa các file OSRM cũ..."
Remove-Item -Path "data/map.osrm*" -Force -ErrorAction SilentlyContinue

Write-Host "Đang xử lý map (osrm-extract)..."
docker run -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-extract -p /opt/car.lua /data/map.osm.pbf

Write-Host "Đang xử lý map (osrm-partition)..."
docker run -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-partition /data/map.osrm

Write-Host "Đang xử lý map (osrm-customize)..."
docker run -t -v "${PWD}/data:/data" osrm/osrm-backend osrm-customize /data/map.osrm

Write-Host "Đang khởi động lại toàn bộ hệ thống bằng docker-compose..."
docker-compose --profile all down
docker-compose --profile all up -d

Write-Host "Hoàn tất! Các service đã được khởi động lại với map Hà Nội."
