export default function InfoPanel({ factors }) {
  return (
    <div className="bg-gray-800 text-gray-100 p-4 rounded-lg shadow-lg w-72">
      <h2 className="text-lg font-semibold mb-2">Key Factors</h2>
      <ul className="space-y-2">
        <li>
          <span className="font-bold">Geology:</span> {factors.geology}
        </li>
        <li>
          <span className="font-bold">Deformation:</span> {factors.deformation}
        </li>
        <li>
          <span className="font-bold">Groundwater:</span> {factors.groundwater}
        </li>
      </ul>
    </div>
  );
}
