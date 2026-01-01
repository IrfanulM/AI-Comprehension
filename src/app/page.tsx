import PassageReader from "@/components/PassageReader";
import passageData from "@/data/passage.json";

export default function Home() {
	return <PassageReader passageData={passageData} />;
}
