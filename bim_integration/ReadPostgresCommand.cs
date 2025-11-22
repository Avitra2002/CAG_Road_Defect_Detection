using Autodesk.Revit.DB;
using Autodesk.Revit.DB.Structure;
using Autodesk.Revit.UI;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;

namespace RevitPostgresAddin
{
    [Autodesk.Revit.Attributes.Transaction(Autodesk.Revit.Attributes.TransactionMode.Manual)]
    public class ReadPostgresCommand : IExternalCommand
    {
        public Result Execute(
            ExternalCommandData commandData,
            ref string message,
            ElementSet elements)
        {
            try
            {
                UIDocument uidoc = commandData.Application.ActiveUIDocument;
                Document doc = uidoc.Document;

                string connString =
                    "Host=localhost;Port=5432;Database=cag" +
                    ";Username=postgres;Password=postgres;";

                List<Defect> defects = LoadDefects(connString);

                TaskDialog.Show("Postgres", $"Loaded {defects.Count} defects from DB.");

                using (Transaction t = new Transaction(doc, "Place Defects"))
                {
                    t.Start();

                    Level level = new FilteredElementCollector(doc)
                        .OfClass(typeof(Level))
                        .FirstElement() as Level;

                    foreach (var d in defects)
                    {
                        XYZ position = LatLngToXYZ(d.Lat, d.Lng,0);

                        FamilySymbol symbol = GetSymbolForSeverity(doc, d.Severity);
                        if (symbol == null)
                        {
                            TaskDialog.Show("Error", $"Missing family for severity: {d.Severity}");
                            continue;
                        }

                        if (!symbol.IsActive)
                            symbol.Activate();

                        FamilyInstance fi = doc.Create.NewFamilyInstance(
                            position,
                            symbol,
                            level,
                            StructuralType.NonStructural
                        );

                        SetParameter(fi, "Type", d.Type);
                        SetParameter(fi, "Severity", d.Severity);
                        SetParameter(fi, "Status", d.Status);
                        SetParameter(fi, "DetectedAt", d.DetectedAt.ToString());
                        SetParameter(fi, "Size", d.Size.ToString());
                        SetParameter(fi, "ID", d.Id.ToString());
                    }

                    t.Commit();
                }

                return Result.Succeeded;
            }
            catch (Exception ex)
            {
                message = ex.Message;
                return Result.Failed;
            }
        }

        
        public class Defect
        {
            public int Id;
            public string Type;
            public string Severity;
            public string Priority;
            public string Status;

            public double Lat;
            public double Lng;

            public double Size;

            public bool IsWorsening;
            public double PrevSize;
            public double CurrentSize;

            public string ImageUrl;
            public DateTime DetectedAt;
        }

        //load data from postgres
        private double SafeDouble(NpgsqlDataReader reader, int index)
        {
            if (reader.IsDBNull(index))
                return 0;

            string raw = reader.GetValue(index).ToString();
            if (double.TryParse(raw, NumberStyles.Any, CultureInfo.InvariantCulture, out double val))
                return val;

            return 0;
        }
        private List<Defect> LoadDefects(string connString)
        {
            var list = new List<Defect>();

            using (var conn = new NpgsqlConnection(connString))
            {
                conn.Open();

                string sql = @"
                    SELECT 
                        id, type, severity, priority, status,
                        coordinates_lat, coordinates_lng,
                        size, image_url, is_worsening,
                        prev_size, current_size, detected_at
                    FROM defects
                    WHERE coordinates_lat IS NOT NULL
                      AND coordinates_lng IS NOT NULL;
                ";

                using (var cmd = new NpgsqlCommand(sql, conn))
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        var d = new Defect();

                        d.Id = reader.GetInt32(0);
                        d.Type = reader.GetString(1);
                        d.Severity = reader.GetString(2);
                        d.Priority = reader.GetString(3);
                        d.Status = reader.GetString(4);
                        d.Lat = SafeDouble(reader, 5);
                        d.Lng = SafeDouble(reader, 6);
                        d.Size = SafeDouble(reader, 7);
                        d.PrevSize = SafeDouble(reader, 10);
                        d.CurrentSize = SafeDouble(reader, 11);


                     
                        d.ImageUrl = reader.IsDBNull(8) ? "" : reader.GetString(8);

                        d.IsWorsening = reader.IsDBNull(9) ? false : reader.GetBoolean(9);
                        

                        d.DetectedAt = reader.GetDateTime(12);

                        list.Add(d);
                    }
                }
            }

            return list;
        }

        //find family models
        private FamilySymbol GetSymbolForSeverity(Document doc, string severity)
        {
            string familyName;

            switch (severity.ToLower())
            {
                case "critical":
                    familyName = "DefectMarker_Critical";
                    break;
                case "high":
                    familyName = "DefectMarker_High";
                    break;
                case "moderate":
                    familyName = "DefectMarker_Moderate";
                    break;
                case "low":
                    familyName = "DefectMarker_Low";
                    break;
                default:
                    familyName = "DefectMarker_Low";
                    break;
            }

            return new FilteredElementCollector(doc)
                .OfClass(typeof(FamilySymbol))
                .OfCategory(BuiltInCategory.OST_GenericModel)
                .Cast<FamilySymbol>()
                //.FirstOrDefault(s => s.Family.Name == familyName);
                .FirstOrDefault(s => s.Name == familyName);
        }

        
        private void SetParameter(FamilyInstance fi, string paramName, string value)
        {
            var p = fi.LookupParameter(paramName);
            if (p != null)
                p.Set(value);
        }

        private XYZ LatLngToXYZ(double lat, double lng, double elevationFeet)
        {
            double earthRadius = 6378137;

            double lat0 = 1.3537628650665283;
            double lng0 = 103.98782348632812;

            double latRad = lat * Math.PI / 180;
            double lngRad = lng * Math.PI / 180;
            double lat0Rad = lat0 * Math.PI / 180;

            double dLat = (lat - lat0) * Math.PI / 180 * earthRadius;
            double dLng = (lng - lng0) * Math.PI / 180 * earthRadius * Math.Cos(lat0Rad);

            double xFeet = dLng * 3.28084;
            double yFeet = dLat * 3.28084;
            double zFeet = elevationFeet * 3.28084;

            return new XYZ(xFeet, yFeet, zFeet);
        }
    }
}
